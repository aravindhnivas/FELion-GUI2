# Importing Modules

# FELion Module
from FELion_definitions import move, ShowInfo

# DATA analysis modules
from scipy.interpolate import interp1d
import numpy as np

# Matplotlib modules
import matplotlib
matplotlib.use('TkAgg')
from matplotlib.lines import Line2D
import matplotlib.pyplot as plt

# System modules
import sys, json, os, shutil
from os.path import dirname, isdir, isfile, join
from pathlib import Path as pt
import traceback

###################################################################################################
class Create_Baseline():

    epsilon = 5

    def __init__(self, felixfile, location, plotIt=True):

        attributes = {
            'felixfile': felixfile, 'fname': felixfile.split(".")[0],
            'baseline': None, 'data': None, 'undo_counter': 0, 'redo_counter': 0, 
            'removed_datas': np.array([[], [], []]), 'redo_datas': np.array([[], [], []]), 'removed_index': [], 'redo_index': [],
            'felix_corrected': False, 'plotIt':plotIt
        }
        for keys, values in attributes.items():
            setattr(self, keys, values)

        self.basefile = f'{self.fname}.base'
        self.powerfile = f'{self.fname}.pow'
        self.cfelix = f'{self.fname}.cfelix'
        
        back_dir = dirname(location)
        folders = ["DATA", "EXPORT", "OUT"]
        if set(folders).issubset(os.listdir(back_dir)): 
            self.location = back_dir
        else: 
            self.location = location
   
        os.chdir(self.location)
        for dirs in folders: 
            if not isdir(dirs): os.mkdir(dirs)
            if isfile(self.felixfile): move(self.location, self.felixfile)
            if isfile(self.basefile): move(self.location, self.basefile)
            if isfile(self.powerfile): move(self.location, self.powerfile)
        
        self.checkInf()
        self.felix_read_file()

        self.PPS = 5
        self.NUM_POINTS = 10
        if isfile(f'./DATA/{self.basefile}'): 
            self.ReadBase() # Read baseline file if exist else guess it
        else: 
            self.GuessBaseLine()
        
        self.InteractivePlots() # Plot

    def checkInf(self):

        Inf = False
        with open(f'./DATA/{self.felixfile}', 'r') as f:
            info = f.readlines()

        info = np.array(info)

        for i, j in enumerate(info):
            if j.startswith('Inf'):
                info[i] = f'# {info[i]}'
                Inf = True
        
        if Inf:
            with open(f'./DATA/{self.felixfile}', 'w') as f:
                for i in range(len(info)): f.write(info[i])
  
    def felix_read_file(self):
  
        file = np.genfromtxt(f'./DATA/{self.felixfile}')
        if self.felixfile.endswith('.felix'): data = file[:,0], file[:,2], file[:, 3]
        elif self.felixfile.endswith('.cfelix'): data = file[:,0], file[:,1], file[:, 2]
        with open(f'./DATA/{self.felixfile}') as f: self.info = f.readlines()[-50:]
        self.data = np.take(data, data[0].argsort(), 1)
     
    def ReadBase(self):

        file = np.genfromtxt(f'./DATA/{self.basefile}')
        self.xs, self.ys = file[:,0], file[:,1]
        with open(f'./DATA/{self.basefile}', 'r') as f:
            self.interpol = f.readlines()[1].strip().split('=')[-1]
    
    def GuessBaseLine(self):
        PPS, NUM_POINTS = self.PPS, self.NUM_POINTS
        max_n = len(self.data[0]) - PPS
        Bx, By = [self.data[0][0]-0.1], [self.data[1][0]]

        for i in range(0, max_n, int(max_n/NUM_POINTS)):
            x = self.data[0][i:i+PPS].mean()
            y = self.data[1][i:i+PPS].mean()
            Bx.append(x)
            By.append(y)
        Bx.append(self.data[0][-1]+0.1)
        By.append(self.data[1][-1])

        self.xs, self.ys = Bx, By

    def InteractivePlots(self):
        self.fig, self.ax = plt.subplots()
        self.canvas = self.fig.canvas
        
        self.line = Line2D(self.xs, self.ys, marker='s', ls='', ms=6, c='b', markeredgecolor='b', animated=True)
        self.ax.add_line(self.line)        
        
        self.inter_xs = np.arange(self.xs[0], self.xs[-1])
        self.funcLine = Line2D([], [], marker='', ls='-', c='b', animated=True)
        self.ax.add_line(self.funcLine)

        self.redraw_f_line()
        self._ind = None

        self.canvas.mpl_connect('draw_event', self.draw_callback)
        self.canvas.mpl_connect('button_press_event', self.button_press_callback)
        self.canvas.mpl_connect('key_press_event', self.key_press_callback)
        self.canvas.mpl_connect('button_release_event', self.button_release_callback)
        self.canvas.mpl_connect('motion_notify_event', self.motion_notify_callback)

        if self.plotIt: self.plot()
        else: return

    def plot(self):

        self.baseline_data, = self.ax.plot(self.data[0], self.data[1], ls='', marker='o', ms=5, markeredgecolor='r', c='r')
        self.ax.set_title(f'BASELINE: {self.felixfile}')
        self.ax.set_xlim((self.data[0][0]-70, self.data[0][-1]+70))
        self.ax.set_xlabel("wavenumber (cm-1)")
        self.ax.set_ylabel("Counts")
        self.ax.grid(True)
        self.canvas.draw()
        plt.show()

    def redraw_f_line(self):
        Bx, By = np.array(self.line.get_data())
        self.inter_xs = np.arange(Bx.min(), Bx.max())

        f = interp1d(Bx, By, kind='cubic')
        self.funcLine.set_data((self.inter_xs, f(self.inter_xs)))

    def draw_callback(self, event):
        self.background = self.canvas.copy_from_bbox(self.ax.bbox)
        self.ax.draw_artist(self.line)
        self.ax.draw_artist(self.funcLine)
        self.canvas.blit(self.ax.bbox)

    def button_press_callback(self, event):
        'whenever a mouse button is pressed'
        if event.inaxes is None:
            return
        if event.button != 1:
            return
        self._ind = self.get_ind_under_point(event)

    def key_press_callback(self, event):
        'whenever a key is pressed'
        #key_press_handler(event, self.canvas, self.toolbar)
        if not event.inaxes:
            return

        elif event.key == 'w':
            ind = self.get_ind_under_point(event)
            if ind is not None:
                xy = np.asarray(self.line.get_data())
                #makes average of few points around the cursor
                i = self.data[0].searchsorted(event.xdata)
                if i + self.PPS > self.data[0].size:
                    i = self.data[0].size - self.PPS
                xy[1][ind] = self.data[1][i:i+self.PPS].mean()
                self.line.set_data((xy[0], xy[1]))
        
        elif event.key == 'd':
            ind = self.get_ind_under_point(event)
            if ind is not None:
                xy = np.asarray(self.line.get_data()).T
                xy = np.array([tup for i, tup in enumerate(xy) if i != ind])
                self.line.set_data((xy[:,0], xy[:,1]))
        
        elif event.key == 'a':
            xy = np.asarray(self.line.get_data())
            xy = np.append(xy,[[event.xdata], [event.ydata]], axis=1)
            self.line.set_data((xy[0], xy[1]))
        
        elif event.key == 'x':
            'To delete the unncessary points'

            new_data = self.data[:-1]
            index = self.get_index_under_basepoint(new_data, event.x, event.y)

            if index is not None:
                xy = np.asarray(self.data).T
                removed_datas = np.array([tup for i, tup in enumerate(xy) if i == index]).T
                self.removed_datas = np.append(self.removed_datas, removed_datas, axis = 1)
                
                self.data = np.array([tup for i, tup in enumerate(xy) if i != index]).T
                self.undo_counter += 1

                self.removed_index = np.append(self.removed_index, index).astype(np.int64)

                self.redraw_baseline()

                self.felix_corrected = True

                print(f'\nRemoved Data: {self.removed_datas}\t{self.removed_datas.shape}\n')
                print(f'\nRemoved Data Index: {self.removed_index}\n')
                
        elif event.key == 'z':
            'To UNDO the deleted point'
            print(f'data dim: {self.data.ndim}\t shape: {self.data.shape}\nundo dim: {self.removed_datas.ndim}\tshape: {self.removed_datas.shape}')
            
            if self.undo_counter == 0: return ShowInfo('NOTE', 'You have reached the end of UNDO')
            else:
                print('\n########## UNDO ##########\n')
                print('Before UNDO')
                print(f'\nRemoved Data: {self.removed_datas}\t{self.removed_datas.shape}\n')
                print(f'\nRemoved Data Index: {self.removed_index}\n')

                self.data = np.insert(self.data, self.removed_index[-1], self.removed_datas[:, -1], axis = 1)

                self.redo_datas = np.append(self.redo_datas, self.removed_datas[:, -1].reshape(3, 1), axis = 1)
                self.removed_datas = np.delete(self.removed_datas, -1, axis = 1)

                self.redo_index = np.append(self.redo_index, self.removed_index[-1]).astype(np.int64)
                self.removed_index = np.delete(self.removed_index, -1)
                               
                self.undo_counter -= 1
                self.redo_counter += 1

                self.redraw_baseline()


                print('After UNDO')
                print(f'\nRemoved Data: {self.removed_datas}\t{self.removed_datas.shape}\n')
                print(f'\nRemoved Data Index: {self.removed_index}\n')
                print('\n########## END UNDO ##########\n')
        
        elif event.key == 'r':
            'To REDO'

            if self.redo_counter == 0: return ShowInfo('NOTE', 'You have reached the end of REDO')
            else:
                print('\n########## REDO ##########\n')
                print('Before REDO')
                print(f'\nRemoved Data: {self.removed_datas}\t{self.removed_datas.shape}\n')
                print(f'\nRemoved Data Index: {self.removed_index}\n')

                self.data = np.delete(self.data, self.redo_index[-1], axis = 1)

                self.removed_datas = np.append(self.removed_datas, self.redo_datas[:, -1].reshape(3, 1), axis = 1)
                self.redo_datas = np.delete(self.redo_datas, -1, axis = 1)
                
                self.removed_index = np.append(self.removed_index, self.redo_index[-1]).astype(np.int64)
                self.redo_index = np.delete(self.redo_index, -1)

                self.undo_counter += 1
                self.redo_counter -= 1

                self.redraw_baseline()

                print('Before REDO')
                print(f'\nRemoved Data: {self.removed_datas}\t{self.removed_datas.shape}\n')
                print(f'\nRemoved Data Index: {self.removed_index}\n')
                print('\n########## END REDO ##########\n')
        
        elif event.key == 'c':
            'To save cfelix file'

            if not self.felix_corrected: return ShowInfo('Info', 'There are no correction made to .felix file')
            else: 
                self.save_cfelix()
                

        elif event.key == 'b':
            'To save baseline file'
            self.SaveBase()

        self.redraw_f_line()
        self.canvas.draw()
    
    def button_release_callback(self, event):
        'whenever a mouse button is released'
        if event.button != 1:
            return
        self._ind = None

    def motion_notify_callback(self, event):
        'on mouse movement'
        if self._ind is None:
            return
        if event.inaxes is None:
            return
        if event.button != 1:
            return
        x, y = event.xdata, event.ydata

        xy = np.asarray(self.line.get_data())
        xy[0][self._ind], xy[1][self._ind] = x, y
        self.line.set_data((xy[0], xy[1]))

        self.redraw_f_line()

        self.canvas.restore_region(self.background)
        self.ax.draw_artist(self.line)
        self.ax.draw_artist(self.funcLine)
        self.canvas.blit(self.ax.bbox)

    def get_ind_under_point(self, event):
        'get the index of the vertex under point if within epsilon tolerance'

        xy = np.asarray(self.line.get_data()).T
        xyt = self.line.get_transform().transform(xy)
        xt, yt = xyt[:, 0], xyt[:, 1]
        d = np.sqrt((xt - event.x)**2 + (yt - event.y)**2)
        indseq = np.nonzero(np.equal(d, np.amin(d)))[0]
        ind = indseq[0]

        if d[ind] >= self.epsilon:
            ind = None

        return ind
    
    def get_index_under_basepoint(self, new_data, x, y):

        xy = np.asarray(new_data).T
        xyt = self.line.get_transform().transform(xy)
        xt, yt = xyt[:, 0], xyt[:, 1]
        d = np.sqrt((xt - x)**2 + (yt - y)**2)
        indseq = np.nonzero(np.equal(d, np.amin(d)))[0]
        index = indseq[0]

        if d[index] >= self.epsilon:
            index = None
        
        return index

    def redraw_baseline(self):
        self.baseline_data.set_data(self.data[0], self.data[1])
        self.canvas.draw()

    def save_cfelix(self):

        with open(f'./DATA/{self.cfelix}', 'w') as f:
            f.write(f'#Noise/Signal corrected for {self.felixfile} data file!\n')
            f.write(f'#Wavelength(cm-1)\t#Counts\tSA\n')

            for i in range(len(self.data[0])): f.write(f'{self.data[0][i]}\t{self.data[1][i]}\t{self.data[2][i]}\n')
            f.write('\n')
            for i in range(len(self.info)): f.write(self.info[i])

        if isfile(f'./DATA/{self.cfelix}'): 
            print(f'Corrected felix file: {self.cfelix}')
            self.felix_corrected = False

            return ShowInfo('Info', f'{self.cfelix} file is saved in /EXPORT directory')
     
    def SaveBase(self):

        self.baseline = self.line.get_data()
        b = np.asarray(self.baseline)
        
        # Saving basefile
        with open(f'./DATA/{self.basefile}', 'w') as f:
            f.write(f'#Baseline generated for {self.fname}.felix data file!\n')
            f.write("#BTYPE=cubic\n")
            for i in range(len(b[0])):
                f.write("{:8.3f}\t{:8.2f}\n".format(b[0][i], b[1][i]))
        
        if isfile(f'./DATA/{self.basefile}'):
            print(f'{self.basefile} is SAVED')
            return ShowInfo('Info', f'{self.basefile} file is saved in /EXPORT directory')

    def get_data(self): return np.asarray([self.data[0], self.data[1]]), np.asarray([self.line.get_data()])

if __name__ == "__main__":

    args = sys.argv[1:][0].split(",")
    filepaths = [pt(files) for files in args]
    for files in filepaths:
        felixfile = files.name
        location = files.parent
        Create_Baseline(felixfile, location)