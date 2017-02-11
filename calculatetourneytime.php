<?php

//Calculator of total time needed to complete a SimplePlanes tournament
//author: quantuumsnot
//version: 2 //increment on each change
//date: 31-01-2017
//usage: php scriptname.php N M, where N is the number of comptetitors and M 
//is (optional) an average competitor's runtime on a race circuit

error_reporting(-1); //Rasmus Lerdorf said to use this
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
mb_internal_encoding('UTF-8');
mb_http_output('UTF-8');
gc_disable(); //disable Garbage Collector when benchmarking
set_time_limit(0); //program's main loop needs time

if (isset($argv[1]) && is_numeric($argv[1]) && !is_float($argv[1]) && in_array($argv[1], range(2, 1000))) {
  $competitors = $argv[1];
} else {
  $competitors = 2;
  echo "\nNumber of competitors must be between 2 and 1000, defaulted to 2";
}

if (isset($argv[2]) && is_numeric($argv[2]) && !is_float($argv[2]) && in_array($argv[2], range(1, 180))) {
  $avgRunTimePerCompetitor = $argv[2];
} else {
  $avgRunTimePerCompetitor = 180; //180 seconds or 3 minutes is the official time limit
  echo "\nNumber of average time per competitor must be between 2 and 180 seconds, defaulted to 180";
}

$battles = $competitors - 1; //the winner is the only one who plays against all players, so battlecount is $competitors - 1
$avgTime = $battles * $avgRunTimePerCompetitor;
$maxTime = $battles * 180;

// a lot of backslash escaping, huh?
$avgTimeConverted = gmdate("z\\d:H\\h:i\\m:s\\s", $avgTime);
$maxtimeConverted = gmdate("z\\d:H\\h:i\\m:s\\s", $maxTime);

exit("\n======================================================================\n
Total number of battles: $battles\n
Average completion time ($avgRunTimePerCompetitor sec avg. time): $avgTime seconds or $avgTimeConverted\n
Maximum completion time (180 sec max. time): $maxTime seconds or $maxtimeConverted\n");

?>
