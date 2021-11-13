#
#  Benchmarking script for rematcher JIT experiment.
#

import collections
import subprocess
from matplotlib import pyplot


# Each individul contender, and how to run it.
# We test node, spidermonkey shell, and native executable,
# in both jit and non-jit versions.
CONTENDERS = {
    "node-nojit": "node ./rematcher-nojit.js",
    "node-jit": "node ./rematcher-jit.js",
    "js-nojit": "js ./rematcher-nojit.js",
    "js-jit": "js ./rematcher-jit.js",
    "c-nojit": "./rematcher-nojit",
    "c-jit": "./rematcher-jit",
}


# The things we want to compare against each other in the graphs.
# Trying to compare node and native produces a uselessly sparse graph :-)
TOURNAMENTS = {
    "js-v-node": ("node-nojit", "node-jit", "js-nojit", "js-jit"),
    "js-v-c": ("js-nojit", "js-jit", "c-nojit", "c-jit"),
}


# Herein we will collect the best result for each contender,
# indexed by input_len and num_iterations.
RESULTS = collections.defaultdict(
    lambda: collections.defaultdict(
        lambda: collections.defaultdict(lambda: 0)
    )
)


# Benchmark for a variety of lengths of input string.
# Longer strings spend more time in JITed loop code versus test harness code.
for input_len in (30, 50, 100, 1000):
    # Benchmark with a variety of numbers of iterations.
    # Larger number of iterations amortize cost of JIT warmup overhead.
    for num_iters in (10, 50, 100, 150, 200, 1000, 2000, 5000, 8000):
        # Run each contender five times, take the best result.
        for _ in xrange(5):
            for contender, command in CONTENDERS.iteritems():
                command = "%s %d %d" % (command, num_iters, input_len)
                # Call the command, parse out the reported matches/sec.
                # Having the program time itself means we're measuring more
                # of the loop performance, and less of the startup time.
                output = subprocess.check_output(command, shell=True)
                result = float(output.strip().split("\n")[-1].split()[1])
                if RESULTS[input_len][num_iters][contender] < result:
                    RESULTS[input_len][num_iters][contender] = result


# Produce one plot per input_len value, per tournament.
for tournament, contenders in sorted(TOURNAMENTS.iteritems()):
    for input_len in sorted(RESULTS.keys()):
        plot_file_name = "jitbench-%s-%d.png" % (tournament, input_len,)
        xvals = sorted(RESULTS[input_len].keys())
        for contender in contenders:
            yvals = []
            for num_iters in xvals:
                best_result = RESULTS[input_len][num_iters][contender]
                yvals.append(best_result)
            pyplot.plot(xvals, yvals, "o-", label=contender)
        pyplot.legend(loc="upper left")
        pyplot.title("Regex Matcher Benchmark, input_len=%d" % (input_len,))
        pyplot.xlabel("num iterations")
        pyplot.ylabel("matches/sec")
        pyplot.savefig(plot_file_name)
        pyplot.show()
