+++
title = "Forking EC2 instances for Mozart/Oz"
date = 2009-01-29T11:51:21.399494
updated = 2009-05-08T17:13:24.717365
[taxonomies]
tags = ['software', 'mozart']
+++

My long-standing obsession with [Mozart/Oz](http://www.mozart-oz.org/) is no secret, but I often find it difficult to articulate precisely *why* I'm so fascinated by the language.  I never seem to make much headway by describing the power and elegance of its novel control structures such as [first-class computation spaces](http://www.mozart-oz.org/documentation/system/node45.html) – which, by the way, I would rank right up there with [continuations](http://en.wikipedia.org/wiki/Continuation) on the list of "language features that sound useless but are actually incredibly powerful"...but instead of going down that esoteric road, let me demonstrate a short and eminently *useful* little hack that I put together last week, one which really highlights the power of the Mozart platform.

<!-- more -->

First, a brief primer on one of Mozart's great strengths: distributed programming.  If you have remote access to a computer with Mozart installed, it's very easy to move some of your computational workload onto that machine.  Here's a short Mozart script that uses the remote computer "guava" to calculate 1000 factorial:

```mozart
%  Wrap the target code in a functor
F = functor
       export result:Result
       define 
           fun {Fact X}
               if X < 2 then 1 else X * {Fact X-1} end
           end
           Result = {Fact 1000}
    end

%  Spawn a new Mozart instance on the remote machine
R = {New Remote.manager init(host:guava fork:ssh)}

%  Have it execute the functor, and print the result
Res = {R apply(F $)}
{System.showInfo Res.result}
```

There are two tricks to getting this working correctly.  First, the code to be run remotely needs to be encapsulated in a [functor](http://www.mozart-oz.org/documentation/tutorial/node7.html), which basically packages up the code itself along with a description of the resources (system modules etc) that it needs in order to run.  In this case the code doesn't use any modules so the functor is very simple.  Second, we create a connection to the remote machine by specifying the hostname ("guava") and the fork method ("ssh").  A Mozart instance is started on the remote machine, the functor is serialised and passed over the network, and the result gets  calculated as required.

The really interesting part is that Mozart has no built-in support for or dependence on the SSH protocol.  As described in the [Remote module documentation](http://www.mozart-oz.org/documentation/system/node48.html), the value given for 'fork' can be any operating system command capable of executing programs on a remote machine; Mozart simply spawns the given command as a subprocess.  This opens up some rather unique opportunities.

What if you don't have access to a beefy remote machine to farm work out to?  Wouldn't it be nice if we could leverage something like Amazon's [Elastic Compute Cloud](http://aws.amazon.com/ec2/) to grab extra computing power on demand?  Indeed.  And this short little shell script is all you need: [`ozec2`](/static/scratch/ozec2).  It performs the following operations:


1. Ignores whatever hostname was given as its first argument
1. Spawns a new instance on EC2, and waits for it to become ready
1. Optionally, downloads and installs Mozart on the instance
1. Uses ssh to execute its remaining arguments as a command on the instance


With a small change to the factorial-calculating code above, we can shift the work off my webserver and onto a dedicated machine instance on EC2:

```
%  Allow enough time for EC2 to start
{Property.put 'dp.probeTimeout' (1000*60*5)}

%  Wrap the target code in a functor
F = functor
       export result:Result
       define 
           fun {Fact X}
               if X < 2 then 1 else X * {Fact X-1} end
           end
           Result = {Fact 1000}
    end

%  Spawn a new EC2 instance and run Mozart
R = {New Remote.manager init(fork:ozec2)}

%  Have it execute the functor, and print the result
Res = {R apply(F $)}
{System.showInfo Res.result}
```

The only difficulty here is that EC2 instances can take a few minutes to start up, while creation of a new remote manager will time out after 30 seconds by default.  To work around this we adjust the `dp.probeTimeout` property accordingly.  But with such substantial startup overhead, you clearly don't want to go around spawning EC2 instances just for a simple calculation like this.

Here's where the power of Mozart really comes into play.  The use of remote connections isn't simply a "neat trick" of the Mozart interpreter – it's a core part of the language and is deeply integrated with other parts of the system.  The best way to show this off is via another of Mozart's great strengths: constraint programming, and in particular its [parallel search](http://www.mozart-oz.org/home/doc/system/node13.html) capabilities.  The following is a simple Mozart functor for solving an optimisation variant of the [Subset Sum problem](http://en.wikipedia.org/wiki/Subset_sum_problem); it finds the smallest subset of a list of items that adds up to a target value:

```
Items = items(8 17 ~20 30 ~32 16 ~17 11 38 46 41 50 ~47 44 ~5 ~12 14 ~28 10 ~18 ~7 ~20 27 11
                   ~32 13 24 16 32 43 33 14 34 ~4 ~47 49 ~31 47 31 ~48 3 14 2 1 ~19 19 ~10 11 ~9 ~45)
Target = 242

SubsetSum = functor
              import FD
              export script:Script order:Order
              define
                  proc {Script Soln} Num Vals Count in
                      Num = {List.length {Record.arity Items{{ '}}' }}
                      %  Solution is a copy of the items list with an additional field 'count',
                      %  an integer that will be constrainted throughout the search.
                      Soln = {AdjoinAt {Record.clone Items} count Count}
                      {FD.int 0#Num Count}
                      %  For each item in the list, we must choose whether to include it.
                      %  The loop returns the list of included values
                      Vals = for collect:C N in 1..Num do
                                 choice  Soln.N = true
                                         Count >=: {FD.reflect.min Count} + 1
                                         {C Items.N}
                                 []      Soln.N = false
                                 end
                             end
                      %  Finally, assert that the target sum was reached
                      Target = {List.foldL Vals (fun {$ A B} A+B end) 0}
                      Count = {List.length Vals}
                  end

                  proc {Order OldSoln NewSoln}
                      %  The new solution is better if it has fewer items
                      NewSoln.count <: OldSoln.count
                  end
            end
```

This functor imports the finite domain constraint module `FD` and exports two procedures that allow Mozart to perform a branch-and-bound search for solutions: `script` will bind its single input variable to a solution, while `order` will assert that one solution is better than another.  The details of this code aren't that important, and it's actually a pretty dumb way to approach subset-sum in Mozart.  The point is that it's a constraint optimisation problem with a large, heavily branching search space – just the kind of problem that lends itself well to parallelisation of the search process.

So suppose that you've developed this code, tried running it on your local machine, and it just takes too darn long for your liking.  Here's all the code necessary to distribute the workload amongst a team of EC2 worker instances instead:

```
S = {New Search.parallel init(nil:6#ozec2)}
Soln = {S best(SubsetSum $)}
```

This simple little two-liner creates a parallel search object, spins up six fresh machine instances using the `ozec2` script, coordinates the search for solutions between them, collects the results and returns the best solution.  I don't know about you, but to my eyes that's pretty close to magic – magic made possible by the powerful control structures and careful balance of features provided by the Mozart platform.  Incidentally, this particular brand of magic depends crucially on having computation spaces as first-class entities in the language...

How does it work out in practice?  Here's a complete script that can be used to run the subset-sum code across a given number of instances – [SubsetSumTest.oz](/static/scratch/SubsetSumTest.oz) – and the timing results it produced on my machine:

<table>
<thead><tr><th></th><th>Local Machine</th><th>1 EC2 Instance</th><th>2 Instances</th><th>3 Instances</th><th>6 Instances</th></tr></thead>
<tbody>
<tr><th>Time:</th><td style="text-align: center;">12m 12s</td><td style="text-align: center;">21m 43s</td><td style="text-align: center;">15m 50s</td><td style="text-align: center;">9m 54s</td><td style="text-align: center;">7m 27s</td></tr></tbody>
</table>

The increase in running time between using the local machine and using a single EC2 instance clearly shows the (quite considerable) overhead involved in spinning up a fresh virtual server.  But as more instances are added the time decreases until it is dominated by the instance start-up time rather than the search time; just *starting* six instances takes around five minutes in total.  For search problems with running times measured in hours instead of minutes, this overhead would likely be negligible.

Of course, this is not a sure-fire recipe for speeding up your programs – after all, parallelism is *hard*!  There are many caveats and provisos and general tricks to getting good results out of parallel search.  The real point is, I'm pretty sure I couldn't have hacked this together over a single afternoon in many languages other than Mozart/Oz.
