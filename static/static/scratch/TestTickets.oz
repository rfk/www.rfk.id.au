%
%  TestTickets.oz:  simple program to test that tickets are offered and
%                   taken correctly.
%
%  Run this functor using --host=hostname and --fork=forkmethod to spawn
%  a remote connection using those settings, and test that tickets can be
%  correctly exposed to it.
%
functor

import

   Connection
   Remote
   Application
   System

prepare

   ArgSpec = record(host(single type:atom default:localhost)
                    fork(single type:atom default:automatic))

define

   Args = {Application.getCmdArgs ArgSpec}
    
   %  Offer a simple ticket
   Tkt = {Connection.offer 'Ticket taken successfully'}
   {System.printInfo "Offered ticket "}
   {System.show Tkt}

   %  Start a remote manager
   RM = {New Remote.manager init(host:Args.host fork:Args.fork)}
   {System.showInfo "Created remote manager"}

   %  Take the ticket remotely
   F = functor
          import Connection 
          export result:Result
          define Result = {Connection.take Tkt}
       end
   Res = {RM apply(F $)}
   {System.showInfo Res.result}

   {Application.exit 0}

end
