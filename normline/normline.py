# Importing Modules

# System modules
import sys
import json
import os
import shutil
from os.path import isdir, isfile
from pathlib import Path as pt

# Data analysis
import numpy as np
from scipy.interpolate import interp1d

# FELion modules
from FELion_baseline_old import felix_read_file, BaselineCalibrator
from FELion_power import PowerCalibrator
from FELion_sa import SpectrumAnalyserCalibrator
from baseline import Create_Baseline

######################################################################################

colors = [
    (31, 119, 180),
    (174, 199, 232),
    (255, 127, 14),
    (255, 187, 120),
    (44, 160, 44),
    (152, 223, 138),
    (214, 39, 40),
    (255, 152, 150),
    (148, 103, 189),
    (197, 176, 213),
    (140, 86, 75),
    (196, 156, 148),
    (227, 119, 194),
    (247, 182, 210),
    (127, 127, 127),
    (199, 199, 199),
    (188, 189, 34),
    (219, 219, 141),
    (23, 190, 207),
    (158, 218, 229),
]

class normplot:

    def __init__(self, received_files, delta):

        self.delta = delta
        received_files = [pt(files) for files in received_files]
        self.location = received_files[0].parent

        # Cheking if the folder contents are already created
        folders = ["DATA", "EXPORT", "OUT"]
        back_dir = self.location.parent

        if set(folders).issubset(os.listdir(back_dir)):
            os.chdir(back_dir)
            self.location = back_dir
        else:
            os.chdir(self.location)

        dataToSend = {"felix": {}, "base": {}, "average": {}}
        xs = np.array([], dtype=np.float)
        ys = np.array([], dtype=np.float)

        c = 0

        for filename in received_files:

            felixfile = filename.name
            fname = filename.stem
            basefile = f"{fname}.base"
            powerfile = f"{fname}.pow"

            self.filetypes = [felixfile, basefile, powerfile]

            for folder, filetype in zip(folders, self.filetypes):
                if not isdir(folder):
                    os.mkdir(folder)
                if isfile(filetype):
                    shutil.move(
                        self.location.joinpath(filetype),
                        self.location.joinpath("DATA", filetype),
                    )

            # Wavelength and intensity of individuals without binning
            wavelength, intensity, raw_intensity, relative_depletion = self.norm_line_felix()

            # collecting Wavelength and intensity to average spectrum with binning
            xs = np.append(xs, wavelength)
            ys = np.append(ys, intensity)

            # Wavelength and intensity of individuals with binning
            wavelength, intensity = self.felix_binning(
                wavelength, intensity)

            self.powerPlot(powerfile, wavelength)

            dataToSend["felix"][f"{felixfile}_histo"] = {
                "x": list(wavelength),
                "y": list(intensity),
                "name": f"{filename.stem}_bar",
                "type": "bar",
                "marker": {"color": f"rgb{colors[c]}"},
            }
            dataToSend["felix"][felixfile] = {
                "x": list(wavelength),
                "y": list(intensity),
                "name": f"{filename.stem}_norm",
                "type": "scatter",
                "line": {"color": f"rgb{colors[c]}"},
            }

            dataToSend["average"][felixfile] = {
                "x": list(wavelength),
                "y": list(intensity),
                "name": f"{filename.stem}_norm",
                "mode": "markers",
                "line": {"color": f"rgb{colors[c]}"},
            }

            self.export_file(fname, wavelength, intensity, raw_intensity, relative_depletion)

            basefile_data = np.array(
                Create_Baseline(felixfile, self.location,
                                plotIt=False).get_data()
            )

            # Ascending order sort by wn
            base_line = basefile_data[1][0]
            base_line = np.take(
                base_line, base_line[0].argsort(), 1).tolist()
            base_felix = basefile_data[0]
            base_felix = np.take(
                base_felix, base_felix[0].argsort(), 1).tolist()

            dataToSend["base"][f"{felixfile}_base"] = {
                "x": list(base_felix[0]),
                "y": list(base_felix[1]),
                "name": f"{filename.stem}_felix",
                "mode": "lines",
                "line": {"color": f"rgb{colors[c]}"},
            }
            dataToSend["base"][f"{felixfile}_line"] = {
                "x": list(base_line[0]),
                "y": list(base_line[1]),
                "name": f"{filename.stem}_base",
                "mode": "lines+markers",
                "marker": {"color": "black"},
            }

            dataToSend["base"][powerfile] = {
                "x": list(self.power_wn),
                "y": list(self.power_mj),
                "name": powerfile,
                "mode": "markers",
                "yaxis": "y2",
                #"line": {"color": f"rgb{colors[c]}"},
                "marker": {"color": f"rgb{colors[c]}"},
            }

            c += 1

        binns, intens = self.felix_binning(xs, ys)
        
        dataToSend["average"]["average"] = {
            "x": list(binns),
            "y": list(intens),
            "name": "Averaged",
            "mode": "lines",
            "line": {"color": "black"},
        }

        # print(f"Before JSON DATA: {dataToSend}")
        dataJson = json.dumps(dataToSend)
        print(dataJson)
        # print("DONE")

    def norm_line_felix(self, PD=True):

        felixfile, basefile, powerfile = self.filetypes

        data = felix_read_file(felixfile)
        powCal = PowerCalibrator(powerfile)
        baseCal = BaselineCalibrator(basefile)
        saCal = SpectrumAnalyserCalibrator(felixfile)

        wavelength = saCal.sa_cm(data[0])

        # Normalise the intensity
        # multiply by 1000 because of mJ but ONLY FOR PD!!!
        if PD:
            intensity = (
                -np.log(data[1] / baseCal.val(data[0]))
                / powCal.power(data[0])
                / powCal.shots(data[0])
                * 1000
            )
        else:
            intensity = (
                (data[1] - baseCal.val(data[0]))
                / powCal.power(data[0])
                / powCal.shots(data[0])
            )
        
        relative_depletion = 1-(data[1]/baseCal.val(data[0]))

        return wavelength, intensity, data[1], relative_depletion

    def export_file(self, fname, wn, inten, raw_intensity, relative_depletion):

        f = open('EXPORT/' + fname + '.dat', 'w')
        f.write("#NormalisedWavelength(cm-1)\t#NormalisedIntensity\t#RawIntensity\t#RelativeDepletion\n")

        for i in range(len(wn)):
            f.write(f"{wn[i]}\t{inten[i]}\t{raw_intensity[i]}\t{relative_depletion[i]}\n")

        f.close()


    def felix_binning(self, xs, ys):

        delta = self.delta
        """
        Binns the data provided in xs and ys to bins of width delta
        output: binns, intensity 
        """

        # bins = np.arange(start, end, delta)
        # occurance = np.zeros(start, end, delta)
        BIN_STEP = delta
        BIN_START = xs.min()
        BIN_STOP = xs.max()

        indices = xs.argsort()
        datax = xs[indices]
        datay = ys[indices]

        # print("In total we have: ", len(datax), ' data points.')
        # do the binning of the data
        bins = np.arange(BIN_START, BIN_STOP, BIN_STEP)
        # print("Binning starts: ", BIN_START,
        #    ' with step: ', BIN_STEP, ' ENDS: ', BIN_STOP)

        bin_i = np.digitize(datax, bins)
        bin_a = np.zeros(len(bins) + 1)
        bin_occ = np.zeros(len(bins) + 1)

        for i in range(datay.size):
            bin_a[bin_i[i]] += datay[i]
            bin_occ[bin_i[i]] += 1

        binsx, data_binned = [], []
        for i in range(bin_occ.size - 1):
            if bin_occ[i] > 0:
                binsx.append(bins[i] - BIN_STEP / 2)
                data_binned.append(bin_a[i] / bin_occ[i])

        # non_zero_i = bin_occ > 0
        # binsx = bins[non_zero_i] - BIN_STEP/2
        # data_binned = bin_a[non_zero_i]/bin_occ[non_zero_i]

        return binsx, data_binned

    def powerPlot(self, powerfile, wavelength):
        with open(f"./DATA/{powerfile}") as f:
            for line in f:
                if line[0] == "#":
                    if line.find("SHOTS") == 1:
                        self.n_shots = float(line.split("=")[-1])

        self.xw, self.yw = np.genfromtxt(f"./DATA/{powerfile}").T
        self.f = interp1d(self.xw, self.yw, kind="linear",
                          fill_value="extrapolate")
        #self.power_wn = np.arange(
        #    wavelength[0], wavelength[-1]+10, (wavelength[-1]-wavelength[0])/10)
        self.power_wn = wavelength
        self.power_mj = self.f(wavelength)

if __name__ == "__main__":

    args = sys.argv[1:][0].split(",")
    filepaths = args[:-1]
    delta = float(args[-1])
    normplot(filepaths, delta)