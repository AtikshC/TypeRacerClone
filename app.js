google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawChart);

var wordTimes = []


//step 1: initialize page 
document.addEventListener("DOMContentLoaded", () => {

    // Retrieve all the past times, and best score from localStorage, if its a returning user
    // Otherwise for a first time user, let allTimes be empty, best is infinity so anything can overwrite it.
    var allTimes = []
    if ("allTimes" in localStorage) {
        allTimes = JSON.parse(localStorage.getItem("allTimes"))
    }

    var best = Infinity
    if ("best" in localStorage) {
        best = parseFloat(localStorage.getItem("best"))
    }

    var average = avg(allTimes)
    var average = (allTimes.length == 0) ? 0.0 : (average / allTimes.length)

    
    var averageLabel = document.getElementById("averageLabel")
    var bestLabel = document.getElementById("bestLabel")

    averageLabel.innerHTML = `Average: ${average}`
    bestLabel.innerHTML = best == Infinity ? "No best recorded yet" : `Best: ${best}`

    var chart = document.getElementById("chart_div")
    chart.style.display = "none"
    //step 2: retrieve from api the phrase we are gonna type
    fetch('https://api.quotable.io/random')
    .then(response => response.json())
    .then(data => {

        // Keep track of the starting time of typer
        var start = 0;
        var end = 0;
        var elapsed = 0;

        var prompt = data.content
        var promptContainer = document.getElementById("prompt-div")

        //step 3: inject letter by letter the phrase in the dom
        var wordCount = prompt.split(' ').length;
        var letterElements = plugQuoteIntoDOM(promptContainer, prompt)

        //step 4: create even handlers for checking when new game started

        var inputElement = document.getElementById('typer');

        var newGameButton = document.getElementById("new-game");
        newGameButton.addEventListener('click', () => window.location.reload())

        var startBtn = document.getElementById('start-btn');
        startBtn.addEventListener('click', (e) => {
            chart.style.display = "block"
            e.target.disabled = true
            inputElement.disabled = false
            inputElement.focus()
            start = Date.now()
            wordTimes.push(start)
        })


        keyboardIdx = 0;
        currentIdx = 0;
        wordStart = true;

        //step 5: determine algorithm for matching typing to sentence
        inputElement.addEventListener('input', (e) => {

            if (currentIdx === letterElements.length) {
                // We have finished typing.
                end = Date.now()
                wordTimes.push(end)
                elapsed = (end - start) / 1000;
                
                var wordsPerMinute = (wordCount / (elapsed / 60)).toFixed(2)

                // Update our allTimes and best
                allTimes.push(wordsPerMinute)
                best = Math.min(best, wordsPerMinute)
                average = avg(allTimes)

                averageLabel.innerHTML = `Average: ${average}`
                bestLabel.innerHTML = best == Infinity ? "No best recorded yet" : `Best: ${best}`

                localStorage.setItem("allTimes", JSON.stringify(allTimes))
                localStorage.setItem("best", best)

                inputElement.disabled = true;
                inputElement.value = ""
                document.getElementById("time").innerHTML = `Your Time: ${elapsed} seconds, Average: ${(wordCount / (elapsed / 60)).toFixed(2)} words/minute`
                drawChart()
                
            } else {
                // this is done when we havent reached end of the string.
                [keyboardIdx, currentIdx, wordStart] = updateGameState(e.data, currentIdx, keyboardIdx, wordStart, inputElement, letterElements)
                if (wordStart) {
                    wordTimes.push(Date.now())
                    drawChart()
                }
                inputElement.setAttribute('data-idx', currentIdx)
            }
        })

    })

})


// Convert each character in the text to an h6 tag
function plugQuoteIntoDOM(container, text) {
    let textArr = []
    for (let i in text) {
        const word = document.createElement('h6')
        word.setAttribute('id', `${i}`);
        word.setAttribute('class', 'letter');
        word.innerHTML = text[i]
        if (text[i] === " ") {
            word.style.width = '5px';
        }
        container.appendChild(word)
        textArr.push(word)
    }
    return textArr;
}

function avg(arr) {
    if (arr.length == 0) {
        return 0
    }
    const sum = arr.reduce((acc, cur) => acc + cur)
    return sum / arr.length
}


// TODO: BUG IN THIS WHEN BACKSPACING.
// Input:
// - The letter that was inputted
// - currentIdx - max index that we are on in the string.
// - keyboardIdx - what index that we have typed until, nonbackspace characters increase this idx, backspace decreases.
// - wordStart - this is true when currentIdx is at the start of a new word.
// - inputElement - DOM element to erase at the beginning of a new word.
// - letterElements - DOM elements representing our quote
function updateGameState(input, currentIdx, keyboardIdx, wordStart, inputElement, letterElements) {
    var correctCharacter = letterElements[currentIdx].innerHTML;
    // We input a character, and it matches character at currentIdx and keyBoardIdx == currentIdx
    if (input === null && wordStart) {
        return [keyboardIdx - 1, currentIdx, wordStart]
    } else if (input === null) {
        return [keyboardIdx - 1, currentIdx, wordStart]
    } else if (input === " " && input === correctCharacter && currentIdx === keyboardIdx) {

        inputElement.value = ""
        letterElements[currentIdx].style.color = 'red';
        return [keyboardIdx + 1, currentIdx + 1, true]

    } else if (input === correctCharacter && keyboardIdx === currentIdx){
        // turn letter element red.
        letterElements[currentIdx].style.color = 'red'
        return [keyboardIdx + 1, currentIdx + 1, false]
    } else {
        // if we type incorrect character
        return [keyboardIdx + 1, currentIdx, wordStart]
    }
}


//step 6: add functionality to time the user
//step 7: show graph or analysis of performance
function drawChart() {
    
    // Create a new array that holds time differences.
    var timeBetweenWords = []
    for (let i = 1; i < wordTimes.length; i++) {
        timeBetweenWords.push([i - 1, (wordTimes[i] - wordTimes[i-1])/1000]);
        
        // time between words , i = 1 [ 
        // [ 0, elapsedTime ]
        // ]

    }

    

    // x axis will have word index
    // y axis will have the time to type the word

    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Word Index');
    data.addColumn('number', 'Time');

    data.addRows(timeBetweenWords)

    // Make this graph discrete instead of continuous 
    // Give it a fixed size x-axis to be the length of the text
    // Play around with gridlines and precision of scales.
    // Play around with the colors.
    // Have the graph display when it starts, instead of after the first word.

    // For next time store personal best and personal average to be able to compare our times too
    // Look into deploying this to your own website.

    var options = {
        title: 'Word Index vs. Time to Type',
        curveType: 'function',
        legend: { position: 'bottom' }
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart_div'))

    chart.draw(data, options);

}

