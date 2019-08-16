## System modules
import sys, json, os
from pathlib import Path as pt
import traceback

## Data analysis
import numpy as np

def var_find(massfile):

	var = {'res': 'm03_ao13_reso', 'b0': 'm03_ao09_width', 'trap': 'm04_ao04_sa_delay'}
	with open(massfile, 'r') as mfile: mfile = np.array(mfile.readlines())

	for line in mfile:
		if not len(line.strip()) == 0 and line.split()[0] == '#':
			for j in var:
				if var[j] in line.split():
					var[j] = float(line.split()[-3])

	res, b0, trap = round(var['res'], 2), int(var['b0']/1000), int(var['trap']/1000)
	return res, b0, trap


def massplot(*args):
	
	received_files = args[0][0].split(',')
	masses, counts = [], []
	fileLabel = []

	for filepath in received_files:

		massfile = pt(filepath)
		masses_temp, counts_temp = np.genfromtxt(massfile).T

		res, b0, trap = var_find(massfile)

		masses.append(masses_temp)
		counts.append(counts_temp)
		fileLabel.append(f"{massfile.stem}: Res:{res}; B0: {b0}ms; trap: {trap}ms")
	
	data = {}
	i = 0
	for mass, count, label in zip(masses, counts, fileLabel):
		data[f"{mass}u"] = {"x":list(mass), "y":list(count), "name": label, "mode":"lines", "showlegend": True}
		i += 1

	dataJson = json.dumps(data)
	print(dataJson)

if __name__=="__main__":
	args = sys.argv[1:]
	massplot(args)