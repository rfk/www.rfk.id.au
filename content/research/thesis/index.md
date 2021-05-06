---
title: RFK | Research | Thesis
---

  <h1>Thesis Material</h1>

  <p>This page hosts material for my PhD thesis, entitled "Asynchronous Multi-Agent Reasoning in the Situation Calculus" and submitted in October 2008.  A PDF version is available for download: <a href="rfk-thesis.pdf">Ryan's Thesis</a>.

  <p>The software developed alongside the thesis is available for download below.  All three are free software, under the terms of the <a href="http://www.gnu.org/copyleft/gpl.html">GNU General Public License</a>.</p>

  <p>&nbsp;</p>

  <ul>
      <li><h3>MIndiGolog1</h3> 
          <p>Download: <a href="MIndiGolog1-0.9.9.tar.gz">MIndiGolog1-0.9.9.tar.gz</a></p>
          <p>This is the MIndiGolog implementation described
      in Chapter 3, which performs online execution planning
      but is limited to synchronous domains. This software runs on the <a href="http://www.mozart-oz.org/">Mozart</a>
      platform version 1.3.2 or later. Its key feature is the use of Mozart's
      parallel search functionality to distribute the execution planning
      workload.</p></li>
      <li><h3>MIndiGolog2</h3>
          <p>Download: <a href="MIndiGolog2-0.9.9.tar.gz">MIndiGolog2-0.9.9.tar.gz</a></p>
          <p>This is the MIndiGolog implementation described
      in Chapter 5, which produces joint executions as
      the output of its planning process, but is limited to only offline
      planning. It is able to render a graphical representation of joint
      executions in the <a href="http://www.graphviz.org/">Graphviz</a> DOT language, from which the diagrams
      in Chapter 5 were generated. This version also runs
      on the <a href="http://www.mozart-oz.org/">Mozart</a> platform version 1.3.2 or later.</p></li>
      <li><h3>PKnows</h3>
          <p>Download: <a href="PKnows-0.9.9.tar.gz">PKnows-0.9.9.tar.gz</a></p>
	  <p>This is our preliminary implementation of an epistemic
      reasoning system using the techniques developed in Chapters 7
      and 8. It is implemented using <a href="http://www.swi-prolog.org/">SWI-Prolog</a> to perform
      symbolic manipulation, calling a modified version of the PDL prover
      from the <a href="http://twb.rsise.anu.edu.au/">Tableaux Workbench suite</a> to handle
      the resulting modal logic queries.</p></li>
  </ul>

  <p>&nbsp;</p>

  <p>There is also a preliminary implementation of MIndiGolog written in Prolog
  rather than Oz.  While it is only a centralised execution planner, and was not
  referred to explicitly in the final thesis,it may
  be of independent interest: <a href="MIndiGolog0.tar.gz">MIndiGolog0.tar.gz</a></p>


