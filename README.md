# botlab
A small physics app for testing the design of aircrafts and their AI

This is a very early version of an application for testing the design of different aircrafts and their AIs used for navigation through a specific course.
Now it simulates a 6DoF movement in two variants:
  
  * main loop based on a lot of open-source game loops
  * main loop based on http://gafferongames.com/game-physics/fix-your-timestep/, and FPS counter is not yet fixed for this. Seems   there's a problem with accuracy of this variant, I don't know why but the travelled distance is too little compared to the length of the course
  * object's position is updated in procedural manner rather than using a vector. For me it is more readable, but it will be rewritten in the future if there is some readability/accuracy/performance gain

The interface is horrible but it works. It will be rewritten too, hopefully with very little lines compared to dat.GUI.js (seems dat.GUI.js has 4237 lines of code in nonminified version, which is too much)

---
Remember that this is a hobby project, I'm not a professional PHYSICS coder (though have some physics background) so be good and explain what and why you're doing with the code :)
