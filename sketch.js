// create web audio api context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const compressor = new DynamicsCompressorNode(audioCtx);

let currentStep = 0;
let midiPitches = Array.from({ length: 8 }, () => ([]));
let newMidiPitches = [];
let middlePitch = 440;

let baseKeySize = 50;
let keySize = 0;
let maxX = 1;
let maxY = 1;

// touch gestures

let wasGesture = "";
let usingMouse = false;
let hoverPosition = undefined;

let totalTouches = [];

let scrollStartX = undefined;
let scrollStartY = undefined;
let zoomStart = undefined;

let scrollToX = undefined;
let scrollToY = undefined;
let zoomTo = undefined;

let scrollXSinceStart = 0;
let scrollYSinceStart = 0;
let zoomSinceStart = 1;


let mode = "edit";
let debugText = "";

const scalePatterns = {
  major12: {
    highlighting: [
      1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1
    ],
    gridUp: 7,
    gridRight: 2
  },
  major31: {
    highlighting: [
      1, -1, 0, 0, -1, 1, -1, 0, 0, -1, 1, 0, 0, 1, -1, 0, 0, -1, 1, -1, 0, 0, -1, 1, -1, 0, 0, -1, 1, 0, 0
    ],
    gridUp: 18,
    gridRight: 5
  }
}

const scales = {
  monarda: {
    name: "Monarda",
    octave: 12,
    pitches: [
      "1/1",
      "17/16",
      "10/9",
      "7/6",
      "5/4",
      "4/3",
      "17/12",
      "3/2",
      "14/9",
      "5/3",
      "7/4",
      "17/9"
    ], 
    pt: scalePatterns.major12 
  },
  neji31: {
    name: "31 JI",
    octave: 31,
    pitches: [
      "1/1",
      "64/63",
      "135/128",
      "15/14",
      "35/32",
      "9/8",
      "8/7",
      "7/6",
      "135/112",
      "315/256",
      "5/4",
      "9/7",
      "21/16",
      "4/3",
      "175/128",
      "45/32",
      "10/7",
      "35/24",
      "3/2",
      "32/21",
      "14/9",
      "45/28",
      "105/64",
      "5/3",
      "12/7",
      "7/4",
      "16/9",
      "945/512",
      "15/8",
      "40/21",
      "63/32"
    ],
    pt: scalePatterns.major31
  }
}
let currentScale = scales.monarda;

//midiPitches[0] = [0, 4, 7, -12, -16, 34]


function setup() {
  let cnv = createCanvas(windowWidth, windowHeight-70);
  baseKeySize = (width > height) ? 65 : 50;

  cnv.style('display', 'block');
  cnv.parent('sketch-holder');

  const sketchHolder = document.getElementById('sketch-holder')
  sketchHolder.addEventListener("touchstart", handleTouchStart, false);
  sketchHolder.addEventListener("touchmove", handleTouchMove, false);
  sketchHolder.addEventListener("touchend", handleTouchEnd, false);
  sketchHolder.addEventListener("gesturestart", function(e) {e.preventDefault();});
  sketchHolder.addEventListener('wheel', handleWheel, { passive: false });

  sketchHolder.addEventListener("mousedown", handleMouseStart, false);
  sketchHolder.addEventListener("mousemove", handleMouseMove, false);
  sketchHolder.addEventListener("mouseup", handleMouseEnd, false);

  document.addEventListener("keydown", handleKeyStart);

  background("#271D62");
  createGUI()

  compressor.connect(audioCtx.destination);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight-70);
  baseKeySize = (width > height) ? 65 : 50;
}

function draw () {
  background("#271D62")

  keySize = baseKeySize * getZoomDelta(zoomSinceStart) //wtf?

  maxX = Math.floor(width/keySize) + 4
  maxY = Math.floor(height/keySize) + 3
  
  textAlign(CENTER, CENTER);
  textFont("IBM Plex Sans");
  textSize(10);
  drawGrid();

  fill("EEE");
  stroke("#0E0F2C");
  strokeWeight(4);
  textSize(11);
  textAlign(LEFT, TOP);

  let infoText = "";
  infoText += "Page: " + (currentStep+1) + ", "
  infoText += "Touches: " + totalTouches.length + ", "
  infoText += "Scroll:" + scrollXSinceStart + "_" + scrollYSinceStart + ", "
  infoText += "Zoom:" + zoomSinceStart + ", "
  text( infoText + "   " + debugText, 4, 4);
}

function handleKeyStart (evt) {
  
  if ("12345678".includes(evt.key)) {
    stepToPage(parseInt(evt.key) -1)
  } else {
    print(evt.key);
  }
}

// function buttonStepBack () {
//   currentStep--;
//   if (currentStep < 0) currentStep = 7
//   playSynth(midiPitches[currentStep], 0)
// }
// function buttonStepForward () {
//   playSynth(midiPitches[currentStep], 0)
//   currentStep++;
//   if (currentStep > 7) currentStep = 0
//   playSynth(midiPitches[currentStep], 0.2)
// }

function stepToPage (pageNum) {
  print("Switched to page " + pageNum);
  currentStep = pageNum;
  playSynth(midiPitches[currentStep], 0);

  // change color
  for (let i = 0; i <= 7; i++) {
    const button_stepToI = document.getElementById('button_step' + (i+1));
    if (i === currentStep) {
      button_stepToI.style.backgroundColor = "#123456";
    } else {
      button_stepToI.style.backgroundColor = "#1F1946";
    }
  }
}

function createGUI () {
  for (let i = 1; i <= 8; i++) {
    const button_stepToI = document.getElementById('button_step' + i);
    print (button_stepToI);
    button_stepToI.addEventListener('touchstart', function () {
      stepToPage(parseInt(this.innerText) -1);
    });
    button_stepToI.addEventListener('mousedown', function () {
      if (usingMouse) stepToPage(parseInt(this.innerText) -1);
    });
  }
  //const button_stepback = document.getElementById('button_stepback')
  //button_stepback.addEventListener('click', buttonStepBack);
  //const button_stepforward = document.getElementById('button_stepforward')
  //button_stepforward.addEventListener('click', buttonStepForward);
}

function evtTouchesToArray (evtTouches) {
  let array = [];
  evtTouches.forEach((touch) => {
    array.push({
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      type: "touch"
    });
  });
  return array;
}

function reactToIStart (newTouches) {
  wasGesture = ""
  if (totalTouches.length === 2) {
    zoomStart = dist(totalTouches[0].x, totalTouches[0].x, totalTouches[1].y, totalTouches[1].y)
    scrollStartX = undefined
    scrollStartY = undefined
  } else if (totalTouches.length === 1) {
    // track movement from touchstart to touchend
    scrollStartX = newTouches[0].x
    scrollStartY = newTouches[0].y
    zoomStart = undefined
  } else {
    scrollStartX = undefined
    scrollStartY = undefined
    zoomStart = undefined
  }

  newTouches.forEach((t) => {
    //for each touch, get which square is there...
    const sqPos = pixelToXy(t.x, t.y)
    const relStep = xyToRelstep(sqPos.x + 2, sqPos.y)
    //debugText += relStep + " / "
  
    const alreadyAt = newMidiPitches.indexOf(relStep)
    if (alreadyAt === -1) {
      newMidiPitches.push(relStep)
    }
  });
  newMidiPitches = []
}

function handleTouchStart (evt) {
  evt.preventDefault();
  const newTouches = evtTouchesToArray(evt.changedTouches);

  totalTouches = totalTouches.concat(newTouches);

  reactToIStart(newTouches);
}

function mouseToTouch () {
  return {
    id: 1,
    x: mouseX,
    y: mouseY,
    type: "mouse"
  }
}

function handleMouseStart (evt) {

  if (!usingMouse || evt.button !== 0) return false;
  totalTouches = [mouseToTouch()];

  reactToIStart(totalTouches);
}

function reactToIDrag () {
  if (totalTouches.length === 2) {
    zoomTo = dist(totalTouches[0].x, totalTouches[0].y, totalTouches[1].x, totalTouches[1].y)
    scrollToX = undefined
    scrollToY = undefined
  } else if (totalTouches.length === 1) {
    // track movement from touchstart to touchend
    scrollToX = totalTouches[0].x
    scrollToY = totalTouches[0].y
    zoomTo = undefined
  } else {
    scrollToX = undefined
    scrollToY = undefined
    zoomTo = undefined
  }
}

function handleTouchMove (evt) {
  evt.preventDefault();

  const newTouches = evtTouchesToArray(evt.changedTouches);

  // update the position in the array of all touches
  totalTouches.forEach((touch, tIndex) => {
    newTouches.forEach((newTouch) => {
      if (touch.id === newTouch.id) {
        totalTouches[tIndex].x = newTouch.x;
        totalTouches[tIndex].y = newTouch.y;
      }
    });
  });

  reactToIDrag();
}

function mouseDragged () {
  if (!usingMouse) return false;
  totalTouches = [mouseToTouch()];

  reactToIDrag();
}

function handleMouseMove () {
  usingMouse = true;
  hoverPosition = mouseToTouch();
}

function handleWheel (evt) {
  evt.preventDefault();
  zoomSinceStart = zoomSinceStart * (1 + evt.deltaY * -0.002);
}

function reactToIEnd (newTouches) {
  let scrollDelta = getScrollDelta(0, 0)
  let zoomDelta = getZoomDelta(1)
  scrollXSinceStart += scrollDelta.x;
  scrollYSinceStart += scrollDelta.y;
  zoomSinceStart *= zoomDelta;

  if (Math.abs(1-zoomDelta) > 0.02) {
    wasGesture = "zoom"
  } else if (Math.abs(scrollDelta.x) > 10 || Math.abs(scrollDelta.y) > 10) {
    wasGesture = "pan"
  }

  scrollStartX = undefined
  scrollStartY = undefined
  zoomStart = undefined

  scrollToX = undefined
  scrollToY = undefined
  zoomTo = undefined

  // dont toggle notes after a gesture
  
  if (wasGesture === "zoom" || wasGesture === "pan") return
  //keySize = baseKeySize * getZoomDelta(zoomSinceStart) //wtf?

  if (mode === "edit") {

    scrollDelta = getScrollDelta(scrollXSinceStart, scrollYSinceStart)

    newTouches.forEach((t) => {
      //for each touch, get which square is there...
      const sqPos = pixelToXy(t.x - scrollDelta.x, t.y - scrollDelta.y)
      const relStep = xyToRelstep(sqPos.x + 2, sqPos.y) //2 is here because of the offset of -2 visually so there's 4 extra keys in width
      //debugText += sqPos.x + " " + sqPos.y + " - "
      
      const alreadyAt = midiPitches[currentStep].indexOf(relStep)
      if (alreadyAt === -1) {
        midiPitches[currentStep].push(relStep)
      } else {
        midiPitches[currentStep].splice(alreadyAt, 1)
      }
    });
    playSynth(midiPitches[currentStep], 0)
  }
  //newMidiPitches = []
}

function handleTouchEnd (evt) {
  evt.preventDefault();

  const newTouches = evtTouchesToArray(evt.changedTouches);

  // remove the note from total
  totalTouches = totalTouches.filter((touch) => {
    const existed = newTouches.findIndex(newTouch => newTouch.id === touch.id);
    return (existed === -1)
  });

  reactToIEnd(newTouches);
}

function handleMouseEnd (evt) {
  if (!usingMouse || evt.button !== 0) return false;
  totalTouches = [];

  const removePosition = mouseToTouch();
  reactToIEnd([removePosition]);
}

function pixelToXy (px, py) {
  const y = Math.ceil((py - height + keySize) / -keySize)
  const oddOffset = (y%2===1) ? keySize/2 : 0
  const x = Math.floor((px-oddOffset)/keySize)
  return {x: x, y: y}
}

function xyToRelstep (x, y) {
  const middleStep = (Math.floor((maxX-Math.floor(maxY/2))/2))*currentScale.pt.gridRight -currentScale.pt.gridRight + Math.floor(maxY/2)*currentScale.pt.gridUp - currentScale.octave
  return (x-Math.floor(y/2))*currentScale.pt.gridRight + y*currentScale.pt.gridUp -middleStep
}

function xyToPixel (x, y) {
  const oddOffset = (y%2===1) ? keySize/2 : 0
  return {x: x*keySize + oddOffset, y:height - keySize - y*keySize}
}

function xyInSquare (inputX, inputY, squareX, squareY) {
  const inX = (inputX < squareX + keySize && inputX > squareX)
  const inY = (inputY < squareY + keySize && inputY > squareY)
  return inX && inY
}

function getScrollDelta (startX, startY) {
  let scrollDeltaX = startX;
  let scrollDeltaY = startY;
  if (scrollStartX !== undefined && scrollToX !== undefined) {
    scrollDeltaX += scrollToX - scrollStartX;
  }
  if (scrollStartY!== undefined && scrollToY !== undefined) {
    scrollDeltaY += scrollToY - scrollStartY;
  }
  // 1.5 grid width deltaX and the grid looks the same
  // 2 grid width deltaY and the grid looks the same
  // split deltas via mod

  const repetitionsX = Math.floor(scrollDeltaX / (1*keySize));
  const repetitionsY = Math.floor(scrollDeltaY / (2.0*keySize));
  const restX = scrollDeltaX - repetitionsX*(1*keySize);
  const restY = scrollDeltaY - repetitionsY*(2.0*keySize);

  return {x: scrollDeltaX, y: scrollDeltaY, restX: restX, restY: restY, repetitionsX: repetitionsX, repetitionsY: repetitionsY}
}

function getZoomDelta (start) {
  let zoomDelta = 1 * start;
  if (zoomStart !== undefined && zoomTo !== undefined) {
    zoomDelta *= zoomTo / zoomStart;
  }
  return zoomDelta;
}

function drawGrid() {

  push()

  // scrolling
  let scrollDelta = getScrollDelta(scrollXSinceStart, scrollYSinceStart)

  for (let y = maxY-1; y >= 0; y--) {
    for (let x = 0; x < maxX; x++) {
      stroke("#0E0F2C")
      strokeWeight(2);

      let pixelPos = xyToPixel(x-2, y); //-2 is here because there's 4 extra keys in width
      pixelPos.x += scrollDelta.restX
      pixelPos.y += scrollDelta.restY
      const relStep = xyToRelstep(x - scrollDelta.repetitionsX, y + scrollDelta.repetitionsY*2);

      const relOct = Math.floor(relStep / currentScale.octave)
      const scaleStep = (relStep+currentScale.octave*128) % currentScale.octave
      const scaleStepName = currentScale.pitches[scaleStep]
      
      const inCurrentStep = midiPitches[currentStep].includes(relStep)
      const inLastStep = (currentStep > 0) ? midiPitches[currentStep-1].includes(relStep) : midiPitches[7].includes(relStep)
      const inNextStep = (currentStep < 7) ? midiPitches[currentStep+1].includes(relStep) : midiPitches[0].includes(relStep)
      const inCursorStep = false//xyInSquare(mouseX, mouseY, pixelPos.x, pixelPos.y)
      let inTouchStep = inCursorStep
      touches.forEach((t) => {
        if (!inTouchStep) inTouchStep = xyInSquare(t.x, t.y, pixelPos.x, pixelPos.y)
      });

      const inScaleHighlighting = currentScale.pt.highlighting[scaleStep]

      const octaveColors = {
        middle: [color("#A660FF"), color("#8239DE"), color("#662CE1")][1-inScaleHighlighting],
        lowest: [color("#0ACCE7"), color("#0897AA"), color("#0B799B")][1-inScaleHighlighting],
        highest: [color("#F99A56"), color("#EC6C44"), color("#D44E3B")][1-inScaleHighlighting]
      }
      const baseGradientDirection = (relOct % 2) ? 0.7 + 0.1 * Math.abs(relOct % 7) : 0.15 * Math.abs(relOct % 7)
      const baseColor = lerpColor(octaveColors.middle, (relOct < 0) ? octaveColors.lowest : octaveColors.highest, baseGradientDirection);
      const outerColor = lerpColor(baseColor, color("#0B0E45"), 0.2);

      fill(outerColor)
      if (inCurrentStep) {
        fill(lerpColor(color("white"), baseColor, 0.5))
      }
      rect(pixelPos.x, pixelPos.y, keySize, keySize, keySize*0.2)

      noStroke()

      if (inCurrentStep) {
        fill(lerpColor(color("white"), baseColor, 0.2))
      } else {
        fill(baseColor)
      }
      rect(pixelPos.x+keySize*0.1, pixelPos.y+keySize*0.08, keySize*0.8, keySize*0.8, keySize*0.15)

      // hints of next and previous
      fill(lerpColor(color("white"), baseColor, 0.8))
      if (inLastStep) {
        arc(pixelPos.x + keySize/2, pixelPos.y + keySize/2 - keySize*0.02, keySize*0.8, keySize*0.8, HALF_PI, HALF_PI*3)
      }
      if (inNextStep) {
        arc(pixelPos.x + keySize/2, pixelPos.y + keySize/2 - keySize*0.02, keySize*0.8, keySize*0.8, HALF_PI*3, HALF_PI)
      }

      const circleSize = map(scaleStep, 1, currentScale.octave, keySize*0.2, keySize*0.7)
      fill(color("#0B0E4520"))
      if (inCurrentStep) {
        fill(lerpColor(color("white"), outerColor, 0.1))
      }
      if (scaleStep > 0) circle(pixelPos.x + keySize/2, pixelPos.y + keySize/2 - keySize*0.03, circleSize)


      if (inCursorStep || inTouchStep) {
        fill("blue")
      } else if (inCurrentStep) {
        fill(baseColor)
      } else {
        fill(lerpColor(baseColor, color("white"), 0.7))
        strokeWeight(2)
        stroke("#1F194630")
      }
      
      const deltaRelstep = xyToRelstep(x - scrollDelta.repetitionsX, y);
      if (deltaRelstep >= 0 && deltaRelstep < currentScale.octave)
      text(scaleStepName, pixelPos.x + keySize/2, pixelPos.y + keySize/2-keySize*0.3)
      
      if (inCurrentStep) {
        text(relStep, pixelPos.x + keySize/2, pixelPos.y + keySize/2+keySize*0.2)
      } 
      if (relStep === 0) {
        if (inCurrentStep) {fill("white")} else {fill(outerColor)}
        noStroke()
        text(middlePitch, pixelPos.x + keySize/2, pixelPos.y + keySize/2-keySize*0.05)
      }
      
      //text(relStep, pixelPos.x + keySize/2, pixelPos.y + keySize/2)
    }
  }

  pop()
}


function playSynth (midiArray, delay) {

  for (let m = 0; m < midiArray.length; m++) {
    const midi = midiArray[m];

    const getOctave = Math.floor((midi+currentScale.octave*16)/currentScale.octave) -16
    const pitchString = currentScale.pitches[midi - getOctave*currentScale.octave]
  
    const pitch = eval(pitchString);
    const baseHz = middlePitch * (2 ** getOctave)
    const playHz = baseHz * pitch
    print(pitchString, "midi", midi, baseHz, playHz)
    playPulse(playHz, audioCtx.currentTime + delay);
  }
}


function playPulse (hz, time) {
  const pulseTime = 0.8;
  const attackTime = 0.01;
  const releaseTime = 0.5;
  //let lfoHz = 5;
  
  const osc = new OscillatorNode(audioCtx, {
    type: "sawtooth",
    frequency: hz,
  });

  const amp = new GainNode(audioCtx, {
    value: 0.001,
  });
  amp.gain.cancelScheduledValues(time);
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(1, time + attackTime);
  amp.gain.linearRampToValueAtTime(
    0,
    time + pulseTime - releaseTime
  );
  
  const lowpass = new BiquadFilterNode(audioCtx, {
    type: "lowpass",
    Q: 1,
    frequency: 700
  });

  


  //const lfo = new OscillatorNode(audioCtx, {
  //  type: "square",
  //  frequency: lfoHz,
  //});

  //lfo.connect(amp.gain);
  osc.connect(lowpass)
  lowpass.connect(amp)
  amp.connect(compressor)
  

  //lfo.start();
  osc.start(time);
  osc.stop(time + pulseTime);
}