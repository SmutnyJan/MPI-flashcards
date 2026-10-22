import os

for filename in os.listdir("."):
    if filename.lower().endswith(".png") and not filename.lower().endswith("_blurred.png"):
        new_filename = filename[:-4] + "_blurred" + filename[-4:]
        os.rename(filename, new_filename)
        print(f"{filename} -> {new_filename}")

print("Hotovo!")