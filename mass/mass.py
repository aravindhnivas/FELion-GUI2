## System modules
import sys, json, os
from pathlib import Path as pt
import traceback

## Data analysis
import numpy as np

def main(*args):
	
	received_files = args[0][0].split(',')
	mass, counts = [], []

	filenames = []

	for filepath in received_files:

		mass_temp, counts_temp = [], []

		massfile = pt(filepath)
		mass_temp, counts_temp = np.genfromtxt(massfile).T

		mass.append(mass_temp)
		counts.append(counts_temp)
		filenames.append(massfile.stem)
	
	data = {}
	i = 0
	for m, c, f in zip(mass, counts, filenames):
		data[f"data_{i}"] = {"x":list(m), "y":list(c), "name": f, "mode":"lines"}
		i += 1

	dataJson = json.dumps(data)
	print(dataJson)

if __name__=="__main__":
	args = sys.argv[1:]
	main(args)