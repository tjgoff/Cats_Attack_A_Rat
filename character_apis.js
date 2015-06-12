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
    img: "cat-orange.png",
    imgNear: "cat-orange-bite.png",
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
    img: "cat-blue.png",
    imgNear: "cat-blue-bite.png",
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
    img: "cat-pink.png",
    imgNear: "cat-pink-bite.png",
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
    img: "cat-yellow.png",
    imgNear: "cat-yellow-bite.png",
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
