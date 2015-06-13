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

//The rat, Brie, follows the mouse pointer
var rat = {
    pos: [],
    speed : 8, //number of pixels rat can move per frame
    maxSpeed: 8,
    id: "ratPic",
    height: 30,
    width: 20,
    goal: [],
    updateGoal : function() {
        this.goal = [window.mouseX+24, window.mouseY - clockHeight+20];//offsets for cheese cursor size
        //adjust rat's speed to prevent overshooting goal
        var dist = distance(this.pos, this.goal);
        if ( dist < 3 ) {
            this.speed = 0;
        } else {
            this.speed = Math.min(this.maxSpeed, dist);
            //rotate the rat image to face the goal (if not too close already)
            var theta = Math.atan2(this.goal[1] - this.pos[1], this.goal[0] - this.pos[0]);
            document.getElementById("ratPic").style.transform = "rotate("+(theta*57.296-90)+"deg)";
        }
    }
};

//Cat1, Willy, goes straight for the rat, but slowly (chaser)
var cat1 = {
    pos: [],
    speed : 4, //pixels per frame
    goal: [],
    id: "cat1",
    img: "media/cat-orange.png",
    imgNear: "media/cat-orange-bite.png",
    sound: 'meow1',
    height: 46,
    width: 50,
    updateGoal : function() {
        this.goal =  rat.pos;
    }
};

//Cat2, Whiskers, goes to random places (wanderer)
var cat2 = {
    pos: [],
    speed : 8, //pixels per frame
    goal: [],
    id: "cat2",
    img: "media/cat-blue.png",
    imgNear: "media/cat-blue-bite.png",
    sound: 'meow2',
    height: 46,
    width: 50,
    updateGoal : function() {
        if( inRange( this.pos, this.goal, this.width) ) {
            this.goal = [Math.round(Math.random()*window.innerWidth), 
                         Math.round(Math.random()*window.innerHeight)];
        }
    }
};

//Cat3, Wendy, runs around the edges, and attacks when lined up with the rat (dasher)
var cat3 = {
    pos: [],
    speed : 11, //pixels per frame
    goal: [],
    id:"cat3",
    img: "media/cat-pink.png",
    imgNear: "media/cat-pink-bite.png",
    sound: 'meow3',
    height:46,
    width: 50,
    state: "CW", //toggles clockwise or counter-clockwise edge movement
    setToEdgeState: function(){
        if(this.state=="ATK"){
            if(Math.random() > 0.5)
                this.state = "CW";
            else
                this.state = "CCW";
        }
    },
    isAtTop: function(){return this.pos[1] <= this.height;},
    isAtRight: function(){return this.pos[0] >= window.innerWidth - this.width;},
    isAtBottom: function(){return this.pos[1] >= window.innerHeight - this.height;},
    isAtLeft: function(){return this.pos[0] <= this.width;},
    updateGoal : function() {
        if( inRange( this.pos, this.goal, this.width) ) {  //pick a corner for new goal
            this.setToEdgeState();
            if(this.state=="CW"){
                if( this.isAtTop() && !this.isAtRight()){//goal = top right
                    this.goal = corners[1];
                } else if(this.isAtLeft()){//goal = top left
                    this.goal = corners[0];
                } else if(this.isAtBottom()){//goal = bottom left
                    this.goal = corners[3];
                } else if(this.isAtRight()) { //goal = bottom right
                    this.goal = corners[2];
                }
            } else if(this.state=="CCW"){
                if( this.isAtTop() && !this.isAtLeft()){//goal = top left
                    this.goal = corners[0];
                } else if(this.isAtRight()){//goal = top right
                    this.goal = corners[1];
                } else if(this.isAtBottom()){//goal = bottom right
                    this.goal = corners[2];
                } else if(this.isAtLeft()) { //goal = bottom left
                    this.goal = corners[3];
                }
            }
        }
        //attack if rat is aligned orthogonally (only when roaming edge)
        if(this.state!="ATK"){
            if (this.isAtLeft() || this.isAtRight() ||
                this.isAtTop() || this.isAtBottom()) {
                if( Math.abs(this.pos[0]-rat.pos[0]) < rat.width ) { //vertical attack
                    if( this.pos[1] <= this.height)
                        this.goal = [this.pos[0], corners[2][1]]; //downward
                    else
                        this.goal = [this.pos[0], corners[0][1]]; //upward
                    this.state = "ATK";
                } else if( Math.abs(this.pos[1]-rat.pos[1]) < rat.height ) { //horizontal attack
                    if( this.pos[0] <= this.width)
                        this.goal = [corners[2][0], this.pos[1]];//rightward
                    else
                        this.goal = [corners[0][0], this.pos[1]];//leftward
                   this.state = "ATK";
                }
            }
        }
    }
};

//Cat4, Bob, is wants to move toward the rat, but avoids other cats (flanker)
var cat4 = {
    pos: [],
    speed : 6, //pixels per frame
    repulse: -60,//repulsive force from other cats
    goal: [],
    id: "cat4",
    img: "media/cat-yellow.png",
    imgNear: "media/cat-yellow-bite.png",
    sound: 'meow4',
    height: 46,
    width: 50,
    updateGoal : function() {
        //add up superposition forces from rat & cats
        //constant attractive force toward rat (doesn't scale with distance)
        var theta = Math.atan2(rat.pos[1] - this.pos[1], rat.pos[0] - this.pos[0]);
        this.goal[0] = this.pos[0] + Math.round( this.speed * Math.cos(theta) );
        this.goal[1] = this.pos[1] + Math.round( this.speed * Math.sin(theta) );  
        var distF;
        //add repulsive forces from other cats (large forces that drop with distance factor)
        for (var i=0; i < 3; i++) {
            theta = Math.atan2(cats[i].pos[1] - this.pos[1], cats[i].pos[0] - this.pos[0]);
            distF = Math.pow(distance(this.pos, cats[i].pos),0.56);
            if(distF != 0) {
                this.goal[0] += Math.round( this.repulse * Math.cos(theta) ) / distF;
                this.goal[1] += Math.round( this.repulse * Math.sin(theta) ) / distF;
            }            
        }
    }
};

var cats = [cat1, cat2, cat3, cat4];//for looping over the cats
var players = [rat, cat1, cat2, cat3, cat4];//for looping over all players

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
    setClassDisplay("preGame", "none");
    document.getElementsByTagName("body")[0].style.cursor = "url(media/cheese.png), auto";
}

function endGame() {
    clearInterval(interval);
    gameActive = false;
    clearTimeout(t);
    clearTimeout(music);
    stopSounds();
    //show non-game elements
    setClassDisplay("preGame", "block");
    //hide game elements
    setClassDisplay("game", "none");
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