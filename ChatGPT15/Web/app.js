(function () {
"use strict";
function byId(id){return document.getElementById(id);}
var messages=byId("messages"),input=byId("messageInput"),sendButton=byId("sendButton");
var menuButton=byId("menuButton"),chatOverlay=byId("chatOverlay"),chatPanel=byId("chatPanel");
var closeChatPanel=byId("closeChatPanel"),newChatButton=byId("newChatButton");
var settingsButton=byId("settingsButton"),settingsOverlay=byId("settingsOverlay"),settingsPanel=byId("settingsPanel");
var closeSettings=byId("closeSettings"),saveSettings=byId("saveSettings");
var apiKeyInput=byId("apiKeyInput"),modelSelect=byId("modelSelect");
var conversation=[],requestRunning=false,memoryStore={};

function safeGet(key,fallback){try{var v=window.localStorage.getItem(key);return v===null?fallback:v;}catch(e){return Object.prototype.hasOwnProperty.call(memoryStore,key)?memoryStore[key]:fallback;}}
function safeSet(key,value){memoryStore[key]=value;try{window.localStorage.setItem(key,value);}catch(e){}}
var apiKey=safeGet("openai_api_key",""),model=safeGet("openai_model","gpt-6-luna");
apiKeyInput.value=apiKey;modelSelect.value=model;
if(!modelSelect.value){model="gpt-6-luna";modelSelect.value=model;}

function show(el){el.classList.remove("hidden");}
function hide(el){el.classList.add("hidden");}
function openChatPanel(){input.blur();show(chatOverlay);}
function openSettings(){input.blur();show(settingsOverlay);}

menuButton.onclick=openChatPanel;
closeChatPanel.onclick=function(){hide(chatOverlay);};
settingsButton.onclick=openSettings;
closeSettings.onclick=function(){hide(settingsOverlay);};
chatOverlay.onclick=function(e){if(e.target===chatOverlay)hide(chatOverlay);};
settingsOverlay.onclick=function(e){if(e.target===settingsOverlay)hide(settingsOverlay);};
chatPanel.onclick=function(e){e.stopPropagation();};
settingsPanel.onclick=function(e){e.stopPropagation();};

saveSettings.onclick=function(){
 var key=apiKeyInput.value.trim();
 if(!key){alert("Enter your OpenAI API key first.");return;}
 apiKey=key;model=modelSelect.value||"gpt-6-luna";
 safeSet("openai_api_key",apiKey);safeSet("openai_model",model);hide(settingsOverlay);
};

function showWelcome(){
 messages.innerHTML='<div class="welcome" id="welcome"><div class="orb">✦</div><h1>What can I help with?</h1><p>A lightweight AI client built for iOS 15.</p></div>';
}
newChatButton.onclick=function(){
 if(requestRunning)return;conversation=[];input.value="";resizeInput();showWelcome();hide(chatOverlay);input.blur();messages.scrollTop=0;updateSendButton();
};

function addMessage(role,text){
 var welcome=byId("welcome");if(welcome)welcome.remove();
 var message=document.createElement("div"),bubble=document.createElement("div");
 message.className="message "+role;bubble.className="bubble";bubble.textContent=text;
 message.appendChild(bubble);messages.appendChild(message);scrollToBottom();return bubble;
}
function scrollToBottom(){window.requestAnimationFrame(function(){messages.scrollTop=messages.scrollHeight;});}
function resizeInput(){input.style.height="auto";var h=Math.min(input.scrollHeight,126);input.style.height=h+"px";input.style.overflowY=input.scrollHeight>126?"auto":"hidden";}
function updateSendButton(){sendButton.disabled=requestRunning||input.value.trim().length===0;}
input.oninput=function(){resizeInput();updateSendButton();};
input.onkeydown=function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}};
sendButton.onclick=function(){sendMessage();};
messages.onclick=function(){if(document.activeElement===input)input.blur();};

function extractText(data){
 var answer="";if(!data||!Array.isArray(data.output))return answer;
 data.output.forEach(function(item){if(!item||!Array.isArray(item.content))return;
  item.content.forEach(function(c){if(c&&c.type==="output_text"&&typeof c.text==="string")answer+=c.text;});
 });return answer;
}

async function sendMessage(){
 if(requestRunning)return;var text=input.value.trim();if(!text)return;
 if(!apiKey){openSettings();return;}
 input.value="";resizeInput();addMessage("user",text);conversation.push({role:"user",content:text});
 var bubble=addMessage("assistant","Thinking…");requestRunning=true;updateSendButton();
 try{
  var response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},body:JSON.stringify({model:model,input:conversation})});
  var data=await response.json();
  if(!response.ok){throw new Error(data&&data.error&&data.error.message?data.error.message:"API request failed ("+response.status+").");}
  var answer=extractText(data)||"The API returned no text.";bubble.textContent=answer;conversation.push({role:"assistant",content:answer});
 }catch(error){
  bubble.textContent="Error: "+(error&&error.message?error.message:String(error));
  if(conversation.length&&conversation[conversation.length-1].role==="user")conversation.pop();
 }finally{requestRunning=false;updateSendButton();scrollToBottom();}
}
document.addEventListener("gesturestart",function(e){e.preventDefault();});
document.addEventListener("gesturechange",function(e){e.preventDefault();});
document.addEventListener("gestureend",function(e){e.preventDefault();});
resizeInput();updateSendButton();window.__chatGPT15Ready=true;
})();