# Modules
import shutil
from os.path import join 
from tkinter import ttk, messagebox, Tk
#################################################################

def move(pathdir, x):
    return (shutil.move(join(pathdir, x), join(pathdir, "DATA", x)), print("%s moved to DATA folder" % x))

def ErrorInfo(error, msg):

    root = Tk()
    root.withdraw()
    messagebox.showerror(str(error), str(msg))
    root.destroy()

def ShowInfo(info, msg):
    
    root = Tk()
    root.withdraw()
    messagebox.showinfo(str(info), str(msg))
    root.destroy()