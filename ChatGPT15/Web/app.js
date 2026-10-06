/* =========================================
   CHATGPT 15
   APP.JS — PART 1 OF 3
   ========================================= */


/* =========================================
   ELEMENTS
   ========================================= */

const app =
	document.getElementById("app");

const messages =
	document.getElementById("messages");

const input =
	document.getElementById("messageInput");

const sendButton =
	document.getElementById("sendButton");

const menuButton =
	document.getElementById("menuButton");

const chatOverlay =
	document.getElementById("chatOverlay");

const chatPanel =
	document.getElementById("chatPanel");

const closeChatPanel =
	document.getElementById("closeChatPanel");

const newChatButton =
	document.getElementById("newChatButton");

const settingsButton =
	document.getElementById("settingsButton");

const settingsOverlay =
	document.getElementById("settingsOverlay");

const settingsPanel =
	document.getElementById("settingsPanel");

const closeSettings =
	document.getElementById("closeSettings");

const saveSettings =
	document.getElementById("saveSettings");

const apiKeyInput =
	document.getElementById("apiKeyInput");

const modelSelect =
	document.getElementById("modelSelect");


/* =========================================
   STATE
   ========================================= */

let conversation = [];

let requestRunning = false;

let keyboardOpen = false;


/*
   This is the normal visible height before
   the keyboard opens.
*/

let normalViewportHeight =
	window.visualViewport ?
	window.visualViewport.height :
	window.innerHeight;


/* =========================================
   LOAD SETTINGS
   ========================================= */

let apiKey =
	localStorage.getItem(
		"openai_api_key"
	) || "";


let model =
	localStorage.getItem(
		"openai_model"
	) || "gpt-5.6";


apiKeyInput.value =
	apiKey;


modelSelect.value =
	model;


/* =========================================
   VIEWPORT HEIGHT
   ========================================= */

function currentViewportHeight() {

	if (window.visualViewport) {

		return window.visualViewport.height;

	}

	return window.innerHeight;

}


/* =========================================
   KEYBOARD / VIEWPORT
   ========================================= */

function updateViewport() {

	const height =
		currentViewportHeight();


	/*
	   Keyboard detection only.

	   IMPORTANT:
	   We no longer shrink #app to the
	   visualViewport height here.

	   Safari already handles the visible
	   viewport. Manually forcing the entire
	   app to visualViewport.height was what
	   caused the broken black area.
	*/

	const difference =
		normalViewportHeight - height;


	const shouldBeOpen =
		difference > 120;


	if (
		shouldBeOpen &&
		!keyboardOpen
	) {

		keyboardOpen = true;

		document.body.classList.add(
			"keyboard-open"
		);

	}


	if (
		!shouldBeOpen &&
		keyboardOpen
	) {

		keyboardOpen = false;

		document.body.classList.remove(
			"keyboard-open"
		);

	}

}


/* =========================================
   VIEWPORT LISTENERS
   ========================================= */

window.addEventListener(
	"resize",
	function() {

		updateViewport();

	}
);


if (window.visualViewport) {

	window.visualViewport.addEventListener(
		"resize",
		function() {

			updateViewport();

			if (
				document.activeElement === input
			) {

				setTimeout(
					scrollToBottom,
					50
				);

			}

		}
	);

}


/* =========================================
   ORIENTATION CHANGE
   ========================================= */

window.addEventListener(
	"orientationchange",
	function() {

		/*
		   Wait for Safari to finish rotating,
		   then establish the new normal height.
		*/

		setTimeout(
			function() {

				normalViewportHeight =
					currentViewportHeight();

				keyboardOpen = false;

				document.body.classList.remove(
					"keyboard-open"
				);

				updateViewport();

			},
			400
		);

	}
);


/* =========================================
   PREVENT PINCH ZOOM
   ========================================= */

document.addEventListener(
	"gesturestart",
	function(event) {

		event.preventDefault();

	}
);


document.addEventListener(
	"gesturechange",
	function(event) {

		event.preventDefault();

	}
);


document.addEventListener(
	"gestureend",
	function(event) {

		event.preventDefault();

	}
);


/* =========================================
   PREVENT DOUBLE TAP ZOOM
   ========================================= */

let lastTouchEnd = 0;


document.addEventListener(
	"touchend",
	function(event) {

		const target =
			event.target;


		const editable =
			target.tagName === "TEXTAREA" ||
			target.tagName === "INPUT" ||
			target.tagName === "SELECT";


		if (editable) {
			return;
		}


		const now =
			Date.now();


		if (
			now - lastTouchEnd < 300
		) {

			event.preventDefault();

		}


		lastTouchEnd =
			now;

	},
	false
);


/* =========================================
   CHAT MENU
   ========================================= */

function openChatPanel() {

	input.blur();

	chatOverlay.classList.remove(
		"hidden"
	);

}


function hideChatPanel() {

	chatOverlay.classList.add(
		"hidden"
	);

}


menuButton.addEventListener(
	"click",
	openChatPanel
);


closeChatPanel.addEventListener(
	"click",
	hideChatPanel
);


/*
   Tapping the dark area outside the
   panel closes it.
*/

chatOverlay.addEventListener(
	"click",
	function(event) {

		if (
			event.target === chatOverlay
		) {

			hideChatPanel();

		}

	}
);


chatPanel.addEventListener(
	"click",
	function(event) {

		event.stopPropagation();

	}
);


/* =========================================
   SETTINGS
   ========================================= */

function openSettings() {

	input.blur();

	settingsOverlay.classList.remove(
		"hidden"
	);

}


function hideSettings() {

	apiKeyInput.blur();

	settingsOverlay.classList.add(
		"hidden"
	);

}


settingsButton.addEventListener(
	"click",
	openSettings
);


closeSettings.addEventListener(
	"click",
	hideSettings
);


settingsOverlay.addEventListener(
	"click",
	function(event) {

		if (
			event.target === settingsOverlay
		) {

			hideSettings();

		}

	}
);


settingsPanel.addEventListener(
	"click",
	function(event) {

		event.stopPropagation();

	}
);


/* =========================================
   SAVE SETTINGS
   ========================================= */

saveSettings.addEventListener(
	"click",
	function() {

		const enteredKey =
			apiKeyInput.value.trim();


		if (!enteredKey) {

			alert(
				"Enter your OpenAI API key first."
			);

			return;

		}


		apiKey =
			enteredKey;


		model =
			modelSelect.value;


		localStorage.setItem(
			"openai_api_key",
			apiKey
		);


		localStorage.setItem(
			"openai_model",
			model
		);


		hideSettings();

	}
);


/* =========================================
   END OF APP.JS PART 1 OF 3
   ========================================= */
/* =========================================
   CHATGPT 15
   APP.JS — PART 2 OF 3
   ========================================= */


/* =========================================
   WELCOME SCREEN
   ========================================= */

function showWelcomeScreen() {

	messages.innerHTML = `
    <div
      class="welcome"
      id="welcome"
    >

      <div class="orb">
        ✦
      </div>

      <h1>
        What can I help with?
      </h1>

      <p>
        A lightweight AI client built
        for iOS 15.
      </p>

    </div>
  `;

}


/* =========================================
   NEW CHAT
   ========================================= */

function startNewChat() {

	if (requestRunning) {
		return;
	}


	conversation = [];


	input.value = "";


	resizeInput();


	showWelcomeScreen();


	hideChatPanel();


	/*
	   Leave keyboard closed when starting
	   a new conversation.
	*/

	input.blur();


	scrollToTop();

}


newChatButton.addEventListener(
	"click",
	startNewChat
);


/* =========================================
   ADD MESSAGE
   ========================================= */

function addMessage(
	role,
	text
) {

	const welcome =
		document.getElementById(
			"welcome"
		);


	if (welcome) {

		welcome.remove();

	}


	const message =
		document.createElement(
			"div"
		);


	message.className =
		"message " + role;


	const bubble =
		document.createElement(
			"div"
		);


	bubble.className =
		"bubble";


	/*
	   Use textContent instead of innerHTML.

	   This means text returned by the API
	   cannot inject HTML or JavaScript.
	*/

	bubble.textContent =
		text;


	message.appendChild(
		bubble
	);


	messages.appendChild(
		message
	);


	scrollToBottom();


	return bubble;

}


/* =========================================
   SCROLL HELPERS
   ========================================= */

function scrollToBottom() {

	window.requestAnimationFrame(
		function() {

			messages.scrollTop =
				messages.scrollHeight;

		}
	);

}


function scrollToTop() {

	window.requestAnimationFrame(
		function() {

			messages.scrollTop = 0;

		}
	);

}


/* =========================================
   AUTO-GROW MESSAGE INPUT
   ========================================= */

function resizeInput() {

	/*
	   Reset first so scrollHeight can
	   shrink again after deleting text.
	*/

	input.style.height =
		"auto";


	const maximumHeight =
		126;


	const desiredHeight =
		Math.min(
			input.scrollHeight,
			maximumHeight
		);


	input.style.height =
		desiredHeight + "px";


	if (
		input.scrollHeight >
		maximumHeight
	) {

		input.style.overflowY =
			"auto";

	} else {

		input.style.overflowY =
			"hidden";

	}

}


input.addEventListener(
	"input",
	resizeInput
);


/* =========================================
   INPUT FOCUS
   ========================================= */

input.addEventListener(
	"focus",
	function() {

		/*
		   Give the iOS keyboard time to
		   complete most of its animation.
		*/

		setTimeout(
			function() {

				updateViewport();

				scrollToBottom();

			},
			250
		);


		/*
		   A second adjustment catches older
		   WebKit after the keyboard settles.
		*/

		setTimeout(
			function() {

				updateViewport();

				scrollToBottom();

			},
			500
		);

	}
);


/* =========================================
   INPUT BLUR
   ========================================= */

input.addEventListener(
	"blur",
	function() {

		/*
		   Wait for the keyboard closing
		   animation before updating state.
		*/

		setTimeout(
			function() {

				updateViewport();

			},
			250
		);

	}
);


/* =========================================
   DISMISS KEYBOARD
   ========================================= */

/*
   Tapping the conversation background
   dismisses the keyboard.

   Because normal message text selection
   is disabled in CSS, this should feel
   much more like a native app.
*/

messages.addEventListener(
	"click",
	function() {

		if (
			document.activeElement === input
		) {

			input.blur();

		}

	}
);


/* =========================================
   SEND BUTTON
   ========================================= */

sendButton.addEventListener(
	"click",
	function() {

		sendMessage();

	}
);


/* =========================================
   RETURN KEY
   ========================================= */

input.addEventListener(
	"keydown",
	function(event) {

		/*
		   Return sends.

		   Shift + Return can still create
		   another line on keyboards where
		   that combination is available.
		*/

		if (
			event.key === "Enter" &&
			!event.shiftKey
		) {

			event.preventDefault();


			sendMessage();

		}

	}
);


/* =========================================
   SEND BUTTON VISUAL STATE
   ========================================= */

function updateSendButton() {

	const hasText =
		input.value.trim().length > 0;


	if (
		hasText &&
		!requestRunning
	) {

		sendButton.disabled =
			false;

	} else {

		sendButton.disabled =
			true;

	}

}


input.addEventListener(
	"input",
	updateSendButton
);


/* =========================================
   BEGIN SEND MESSAGE
   ========================================= */

async function sendMessage() {

	/*
	   Prevent duplicate requests.
	*/

	if (requestRunning) {
		return;
	}


	const text =
		input.value.trim();


	if (!text) {
		return;
	}


	/*
	   If no API key has been configured,
	   open Settings instead of attempting
	   a request.
	*/

	if (!apiKey) {

		input.blur();


		openSettings();


		alert(
			"Enter your OpenAI API key first."
		);


		return;

	}


	/*
	   Clear composer immediately.
	*/

	input.value = "";


	resizeInput();


	updateSendButton();

