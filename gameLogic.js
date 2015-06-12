var frameRate = 50, interval;
var corners, startTime;
var gameActive = false, pageLoaded = false, soundsOn = false, music;
var clock, clockHeight = 0, seconds = 0, minutes = 0, hours = 0, t, timeMult = 1;
var standardArea = 1520000, screenFactor = 1;//used to scale up size/speed of game for large displays

//Audio channels for sounds
var num_audioChannels = 5;
var audioChannels = new Array();
for (var i=0; i < num_audioChannels; i++) {
    audioChannels[i] = new Array();
    audioChannels[i]['channel'] = new Audio();
    audioChannels[i]['done'] = -1;//channel is available if done < timestamp
}

var cats = [cat1, cat2, cat3, cat4];//for looping over the cats
var players = [rat, cat1, cat2, cat3, cat4];//for looping over all players

//Given the id of an audio element, play the corresponding sound on first available channel
function play_sound(id) {
	for (var i=0; i < audioChannels.length; i++) {
		now = new Date();
		if (audioChannels[i]['done'] < now.getTime()) {	//check if channel done playing
			audioChannels[i]['done'] = now.getTime() + document.getElementById(id).duration*1000;
			audioChannels[i]['channel'].src = document.getElementById(id).src;
			audioChannels[i]['channel'].load();
			audioChannels[i]['channel'].play();
			break;
		}
	}
}

//Stops all sounds from playing (does not end callback to restart background music)
function stopSounds() {
    for (var i=0; i < audioChannels.length; i++) {
        audioChannels[i]['done'] = -1;
        audioChannels[i]['channel'].pause();
        audioChannels[i]['channel'].currentTime = 0;
	}
}

//keep track of the mouse pointer position in order to drive the rat
document.onmousemove = function(e) {
    var event = e || window.event;
    window.mouseX = event.clientX;
    window.mouseY = event.clientY;
}

//utility function for setting display: value; CSS for all elements of a class
function setClassDisplay(className, disp) {
    var x = document.getElementsByClassName(className);
    for (var i = 0; i < x.length; i++) {
        x[i].style.display = disp;
    }
}

//return distance between two 2-D points
function distance(p1, p2) {
    var x = p1[0] - p2[0];
    var y = p1[1] - p2[1];
    return Math.sqrt( (x*x) + (y*y) );
}

function inRange(pos1, pos2, dist) {
    return distance(pos1, pos2) <= dist;
}

//Each rat/cat should first update it's goal,then this function moves them toward the goal
function moveTowardGoal(mover) {
    var theta = Math.atan2(mover.goal[1] - mover.pos[1], mover.goal[0] - mover.pos[0]);
    mover.pos[0] += Math.round( mover.speed * timeMult * screenFactor * Math.cos(theta) );
    mover.pos[1] += Math.round( mover.speed * timeMult * screenFactor * Math.sin(theta) );
    document.getElementById(mover.id).style.marginLeft = mover.pos[0] - mover.width + "px";
    document.getElementById(mover.id).style.marginTop = mover.pos[1] - mover.height + "px";
}

//Update the game area
function updateGameState() {
    if(window.mouseX == undefined || window.mouseY == undefined || gameActive == false){
        return;
    }
    
    //each rat/cat gets to update and move
    for(var i=0; i < players.length; i++){
        players[i].updateGoal();
        moveTowardGoal(players[i]);
    }
    
    //Check lose condition and update cat image if near rat
    for(i=0; i < cats.length; i++){
        if( inRange(rat.pos, cats[i].pos, cats[i].width*1.1)) {
            endGame();
        } else if( inRange(rat.pos, cats[i].pos, cats[i].width*2.5)) {
            if(soundsOn && $('#'+cats[i].id).attr("src") != cats[i].imgNear){
                play_sound(cats[i].sound);//switching to "near" image + sound
            }
            $('#'+cats[i].id).attr("src", cats[i].imgNear);
        } else {
            $('#'+cats[i].id).attr("src", cats[i].img);
        }
    }
}

//Track the player's progress on the timer
function addSec() {
    seconds++;
    if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
            minutes = 0;
            hours++;
        }
    }
    clock.textContent = (hours ? (hours > 9 ? hours : "0" + hours) : "00") + 
                        ":" + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") +
                        ":" + (seconds > 9 ? seconds : "0" + seconds);
    timer();
}
function timer() {
    t = setTimeout(addSec, 1000/timeMult);
}

function add_score(){
    //do a conversion into ms for storage
    var time = $('#clock').text();
    seconds += minutes*60+hours*3600;
    console.log(secToTime(seconds));
    console.log(time);
}

function secToTime(sec){
    var seconds = Math.floor(sec%60);
     sec /= 60;
    var minutes = Math.floor(sec%60);
     sec /= 60;
    var hours = Math.floor(sec)
    return {"hours" : hours, "minutes" : minutes, "seconds" : seconds};
}

function startMusic() {
    play_sound('backgroundMusic');
    music = setTimeout(startMusic, document.getElementById('backgroundMusic').duration*1000 );
}

function startGame() {
    if(!pageLoaded) {
        return;//the page must finish loading before game can start
    }
    //turn sounds/music on/off
    if (document.getElementById('soundsOn').checked) {
            soundsOn = true;
    } else {
         soundsOn = false;
    }
    if (document.getElementById('musicOn').checked)
        startMusic();
    //Set time tracking values
    timeMult = Number($('#timeMultiplier').val());
    interval = setInterval(updateGameState, 1000/(frameRate));
    gameActive = true;
    clock = document.getElementById('clock')
    clock.textContent = "00:00:00";
    seconds = 0; minutes = 0; hours = 0;
    timer();
    //reset game pieces
    rat.pos =  [window.innerWidth/2, window.innerHeight/2];
    cat1.pos = [corners[2][0], corners[2][1]];
    cat2.pos = [corners[0][0], corners[0][1]];
    cat2.goal = [corners[0][0], corners[0][1]];    
    cat3.pos = [corners[1][0], corners[1][1]];
    cat3.goal = [corners[2][0], corners[2][1]];
    cat4.pos = [corners[3][0], corners[3][1]];
    cat4.goal = [corners[3][0], corners[3][1]];
    
    setClassDisplay("game", "block");
    setClassDisplay("pre-game", "none");
    document.getElementsByTagName("body")[0].style.cursor = "url(cheese.png), auto";
}

function endGame() {
    clearInterval(interval);
    gameActive = false;
    clearTimeout(t);
    clearTimeout(music);
    stopSounds();
    //show non-game elements
    setClassDisplay("pre-game", "block");
    //hide game elements
    setClassDisplay("game", "none");
    add_score();
    document.getElementsByTagName("body")[0].style.cursor = "default";
}

function adjustToWindow(){
    //Scale size/speed of game elements based on display size. 
    //Average of 1 and ratio of expected screen size
    screenFactor = (1+(window.innerHeight * window.innerWidth / standardArea))/2;
    
    //use loaded elements to get game dimensions
    rat.height = $('#ratPic').height()/2;
    rat.width = $('#ratPic').width()/2;
    cat1.height = cat2.height = cat3.height = $('#cat1').height()/2;
    cat1.width = cat2.width = cat3.width = $('#cat1').width()/2;
    clockHeight = $('#clock').height();
    corners = [ [cat3.width, cat3.height],
                [window.innerWidth-cat3.width, cat3.height],
                [window.innerWidth-cat3.width, window.innerHeight-cat3.height],
                [cat3.width, window.innerHeight-cat3.height] ];
}

window.onresize = function(event) {
    adjustToWindow();
};

window.onload = function() {
    adjustToWindow();
    //Hide game elements until game starts
    setClassDisplay("game", "none");
    pageLoaded = true;
}