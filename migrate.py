
import os
import yaml

INDIR = "./old_content/blog/entry"
OUTDIR = "./content/blog/entry"

for nm in os.listdir(INDIR):
    with open(os.path.join(INDIR, nm)) as infile:
        config = []
        lines = iter(infile)
        # Every entry will contain a "---"-delimited section,
        # so this loop always terminates.
        while next(lines) != "---":
            pass
        for ln in lines:
            if ln == "---":
                break
            config.append(ln)
        print(f"{nm} = {config}")