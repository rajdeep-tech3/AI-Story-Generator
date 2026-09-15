let currentStory = "";


// =====================================================
// GENERATE STORY
// =====================================================

async function generateStory() {

    const loading =
        document.getElementById("loading");

    const storyBox =
        document.getElementById("storyBox");

    const genre =
        document.getElementById("genre").value;

    const characters =
        document.getElementById("characters").value;

    const setting =
        document.getElementById("setting").value;

    const length =
        document.getElementById("length").value;


    loading.innerHTML =
        "✨ Writing your story...";


    storyBox.innerHTML =
        "Generating your story...";


    try {

        const response = await fetch("/generate", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                genre: genre,

                characters: characters,

                setting: setting,

                length: length

            })

        });


        const responseText =
            await response.text();


        console.log(
            "Story server response:",
            responseText
        );


        let data;

        try {

            data = JSON.parse(responseText);

        } catch (jsonError) {

            throw new Error(
                "Server returned invalid response."
            );

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Story generation failed."
            );

        }


        if (!data.story) {

            throw new Error(
                "No story was returned."
            );

        }


        currentStory =
            data.story;


        storyBox.innerHTML =
            currentStory;


        loading.innerHTML =
            "✨ Story generated successfully!";


    } catch (error) {

        console.error(
            "Story generation error:",
            error
        );


        storyBox.innerHTML =
            "❌ Story could not be generated.";


        loading.innerHTML =
            "❌ " + error.message;

    }

}



// =====================================================
// TRANSLATE STORY
// =====================================================

async function translateStory() {

    const language =
        document.getElementById("language").value;

    if (!currentStory) {
        document.getElementById("translationResult").innerHTML =
            "❌ Please generate a story first.";
        return;
    }

    document.getElementById("translationResult").innerHTML =
        "⏳ Translating story...";

    try {

        const response = await fetch("/translate", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                story: currentStory,
                language: language
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Translation failed."
            );
        }

        document.getElementById("translationResult").innerHTML =
            data.translation;

    } catch (error) {

        console.error("Translation error:", error);

        document.getElementById("translationResult").innerHTML =
            "❌ Translation failed: " + error.message;
    }
}



// =====================================================
// TEXT-TO-SPEECH (ENGLISH STORY) with voice, speed, highlighting
// =====================================================

let availableVoices = [];
let highlightTimeouts = [];
let speechQueue = [];
let speechCancelled = false;


function loadVoices() {

    availableVoices = window.speechSynthesis.getVoices()
        .filter(voice => voice.lang.startsWith("en"));

    const voiceSelect = document.getElementById("voiceSelect");

    if (availableVoices.length === 0) {
        return;
    }

    voiceSelect.innerHTML = "";

    availableVoices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();


function speakStory() {

    if (!currentStory) {
        alert("Please generate a story first.");
        return;
    }

    if (!("speechSynthesis" in window)) {
        alert("Sorry, your browser doesn't support text-to-speech.");
        return;
    }

    window.speechSynthesis.cancel();
    clearHighlightTimers();
    speechCancelled = false;

    const storyBox = document.getElementById("storyBox");

    const words = currentStory.split(/\s+/).filter(Boolean);

    storyBox.innerHTML = words
        .map((word, index) => `<span class="word" data-index="${index}">${word}</span>`)
        .join(" ");

    const sentences = currentStory.match(/[^.!?]+[.!?]*/g) || [currentStory];

    let wordOffset = 0;
    speechQueue = sentences.map(sentence => {
        const sentenceWordCount = sentence.split(/\s+/).filter(Boolean).length;
        const chunk = { text: sentence, wordOffset };
        wordOffset += sentenceWordCount;
        return chunk;
    });

    speakNextChunk();
}


function speakNextChunk() {

    if (speechCancelled || speechQueue.length === 0) {
        clearWordHighlight();
        return;
    }

    const chunk = speechQueue.shift();

    const utterance = new SpeechSynthesisUtterance(chunk.text);

    const voiceSelect = document.getElementById("voiceSelect");
    const selectedIndex = voiceSelect.value;
    if (selectedIndex !== "" && availableVoices[selectedIndex]) {
        utterance.voice = availableVoices[selectedIndex];
    }

    const speedSelect = document.getElementById("speedSelect");
    const rate = parseFloat(speedSelect.value);
    utterance.rate = rate;
    utterance.lang = "en-US";
    utterance.pitch = 1;

    let realBoundaryFired = false;
    let fallbackTimerId = null;

    utterance.onboundary = (event) => {

        if (event.name !== "word") return;

        realBoundaryFired = true;

        if (fallbackTimerId) {
            clearTimeout(fallbackTimerId);
            fallbackTimerId = null;
        }
        clearHighlightTimers();

        const spokenSoFar = chunk.text.slice(0, event.charIndex);
        const localWordIndex = spokenSoFar.split(/\s+/).filter(Boolean).length;

        highlightWord(chunk.wordOffset + localWordIndex);
    };

    utterance.onstart = () => {
        fallbackTimerId = setTimeout(() => {
            if (!realBoundaryFired) {
                const chunkWords = chunk.text.split(/\s+/).filter(Boolean);
                scheduleWordHighlights(chunkWords, rate, chunk.wordOffset);
            }
        }, 250);
    };

    utterance.onend = () => {
        if (fallbackTimerId) clearTimeout(fallbackTimerId);
        clearHighlightTimers();
        speakNextChunk();
    };

    utterance.onerror = (event) => {
        console.error("Speech error:", event);
        speakNextChunk();
    };

    window.speechSynthesis.speak(utterance);
}


function scheduleWordHighlights(words, rate, wordOffset) {

    const baseMsPerWord = 60000 / 150;
    const msPerWord = baseMsPerWord / rate;

    let elapsed = 0;

    words.forEach((word, index) => {

        const wordDuration = msPerWord * (0.6 + word.length / 8);

        const timeoutId = setTimeout(() => {
            highlightWord(wordOffset + index);
        }, elapsed);

        highlightTimeouts.push(timeoutId);

        elapsed += wordDuration;
    });
}


function highlightWord(index) {
    clearWordHighlight();
    const storyBox = document.getElementById("storyBox");
    const currentSpan = storyBox.querySelector(`[data-index="${index}"]`);
    if (currentSpan) currentSpan.classList.add("speaking-word");
}


function clearWordHighlight() {
    const storyBox = document.getElementById("storyBox");
    const prevHighlight = storyBox.querySelector(".speaking-word");
    if (prevHighlight) prevHighlight.classList.remove("speaking-word");
}


function clearHighlightTimers() {
    highlightTimeouts.forEach(id => clearTimeout(id));
    highlightTimeouts = [];
}


function stopSpeaking() {
    speechCancelled = true;
    speechQueue = [];
    window.speechSynthesis.cancel();
    clearHighlightTimers();
    clearWordHighlight();
}



// =====================================================
// COPY STORY TO CLIPBOARD
// =====================================================

async function copyStory() {

    if (!currentStory) {
        alert("Please generate a story first.");
        return;
    }

    try {

        await navigator.clipboard.writeText(currentStory);

        const loading = document.getElementById("loading");
        loading.innerHTML = "📋 Story copied to clipboard!";

    } catch (error) {

        console.error("Copy failed:", error);
        alert("Could not copy story. Please try selecting and copying manually.");

    }

}



// =====================================================
// DOWNLOAD ENGLISH STORY
// =====================================================

function downloadStory() {

    if (!currentStory) {

        alert(
            "Please generate a story first."
        );

        return;

    }


    const blob =
        new Blob(

            [currentStory],

            {
                type: "text/plain"
            }

        );


    const link =
        document.createElement("a");


    link.href =
        URL.createObjectURL(blob);


    link.download =
        "AI_Story.txt";


    link.click();


    URL.revokeObjectURL(
        link.href
    );

}