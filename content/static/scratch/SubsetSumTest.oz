%
%  Simple script to test performance of ParallelSearch on EC2.
%  Compile me like so:
%
%    ozc -p -x SubsetSumTest.oz
%
%  Run me like so:
%
%    time ./SubsetSumTest --num=X
%
%  Where X is the number of instances you want to use (or 0 to use localhost)
%

functor

import

  System
  Application
  Property
  Search

prepare

  ArgSpec = record(num(single type:int default:0))

define

  Args = {Application.getCmdArgs ArgSpec}

  Items = items(8 17 ~20 30 ~32 16 ~17 11 38 46 41 50 ~47 44 ~5 ~12 14 ~28 10 ~18 ~7 ~20 27 11 ~32 13 24 16 32 43 33 14 34 ~4 ~47 49 ~31 47 31 ~48 3 14 2 1 ~19 19 ~10 11 ~9 ~45)
  Target = 242

  % Allow enough time for EC2 to start
  {Property.put 'dp.probeTimeout' (1000*60*5)}

  % Create simple subset-sum solver as a functor
  SubsetSum = functor 
                import FD
                export script:Script order:Order
                define
                    proc {Script Soln} Num Vals Count in
                        Num = {List.length {Record.arity Items}}
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

  % Initialise an appropriate search object
  S = _
  if Args.num == 0 then
      S = {New Search.parallel init(localhost)}
  else
      S = {New Search.parallel init(nil:(Args.num#ozec2))}
  end

  % Use it to find the best solution
  Solns = {S best(SubsetSum $)}
  if Solns == nil then
      {System.showInfo "No solution"}
  else Idxs Soln in
      Idxs = {Record.filter {List.last Solns} fun {$ B} B == true end}
      Soln = {Record.toList {Record.zip Idxs Items fun {$ _ Val} Val end}}
      {System.showInfo "Best solution is: "}
      {System.show Soln}
  end

  {Application.exit 0}

end

