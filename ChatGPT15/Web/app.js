(function(){
"use strict";
function $(id){return document.getElementById(id)}
var messages=$("messages"),input=$("messageInput"),send=$("sendButton"),menu=$("menuButton"),settings=$("settingsButton");
var sidebarOverlay=$("sidebarOverlay"),sidebar=$("sidebar"),closeSidebar=$("closeSidebar"),newChat=$("newChatButton"),chatList=$("chatList"),chatSearch=$("chatSearch");
var settingsOverlay=$("settingsOverlay"),settingsPanel=$("settingsPanel"),closeSettings=$("closeSettings"),saveSettings=$("saveSettings");
var apiInput=$("apiKeyInput"),modelSelect=$("modelSelect"),systemPrompt=$("systemPrompt"),usageToggle=$("usageToggle"),usageText=$("usageText");
var modelButton=$("modelButton"),headerModel=$("headerModel"),modelOverlay=$("modelOverlay"),modelPanel=$("modelPanel");
var attach=$("attachButton"),picker=$("imagePicker"),preview=$("attachmentPreview");
var messageMenu=$("messageMenu"),copyMessage=$("copyMessage"),retryMessage=$("retryMessage"),shareMessage=$("shareMessage"),cancelMessageMenu=$("cancelMessageMenu");
var store={},chats=[],activeId=null,running=false,controller=null,pendingImage=null,selectedAssistantText="",lastUsage=null;
var prices={"gpt-6-luna":[.05,.25],"gpt-6.1-sol":[1,5],"gpt-6-astra":[5,25]};

function get(k,d){try{var v=localStorage.getItem(k);return v===null?d:v}catch(e){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:d}}
function set(k,v){store[k]=v;try{localStorage.setItem(k,v)}catch(e){}}
function parse(k,d){try{return JSON.parse(get(k,""))||d}catch(e){return d}}
function show(el){el.classList.remove("hidden")} function hide(el){el.classList.add("hidden")}
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function modelName(m){return m==="gpt-6.1-sol"?"GPT-6.1 Sol":m==="gpt-6-astra"?"GPT-6 Astra":"GPT-6 Luna"}
var apiKey=get("openai_api_key",""),model=get("openai_model","gpt-6-luna"),instructions=get("system_prompt",""),showUsage=get("show_usage","0")==="1";
chats=parse("chatgpt15_chats",[]);apiInput.value=apiKey;modelSelect.value=model;systemPrompt.value=instructions;usageToggle.checked=showUsage;headerModel.textContent=modelName(model);

function persist(){set("chatgpt15_chats",JSON.stringify(chats))}
function chat(){return chats.find(function(c){return c.id===activeId})||null}
function makeChat(){var c={id:"c"+Date.now(),title:"New chat",created:Date.now(),updated:Date.now(),messages:[]};chats.unshift(c);activeId=c.id;persist();return c}
function titleFrom(text){var t=String(text).replace(/\s+/g," ").trim();return t.length>34?t.slice(0,34)+"…":t||"New chat"}
function renderSidebar(filter){
 chatList.innerHTML="";var q=(filter||"").toLowerCase();
 chats.filter(function(c){return !q||c.title.toLowerCase().indexOf(q)>=0}).forEach(function(c){
  var row=document.createElement("div");row.className="chatRow";
  var open=document.createElement("button");open.className="chatOpen";open.innerHTML='<span class="chatTitle">'+esc(c.title)+'</span><span class="chatMeta">'+new Date(c.updated).toLocaleDateString()+'</span>';
  open.onclick=function(){activeId=c.id;renderChat();hide(sidebarOverlay)};
  var del=document.createElement("button");del.className="chatDelete";del.textContent="✕";del.onclick=function(){if(confirm("Delete this chat?")){chats=chats.filter(function(x){return x.id!==c.id});if(activeId===c.id)activeId=null;persist();renderSidebar(chatSearch.value);renderChat()}};
  row.appendChild(open);row.appendChild(del);chatList.appendChild(row);
 });
 if(!chatList.children.length){chatList.innerHTML='<div class="settingsNote">No chats yet.</div>'}
}
function renderChat(){
 messages.innerHTML="";var c=chat();
 if(!c||!c.messages.length){messages.innerHTML='<div class="welcome" id="welcome"><div class="orb">✦</div><h1>What can I help with?</h1><p>ChatGPT-style AI for iOS 15.</p></div>';return}
 c.messages.forEach(function(m){addBubble(m.role,m.text,m.image,false)});
 scrollBottom();
}
function markdown(text){
 var s=esc(text);var blocks=[];
 s=s.replace(/```([\s\S]*?)```/g,function(_,code){blocks.push("<pre><code>"+code+"</code></pre>");return "@@BLOCK"+(blocks.length-1)+"@@"});
 s=s.replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/^### (.+)$/gm,"<h3>$1</h3>").replace(/^## (.+)$/gm,"<h2>$1</h2>").replace(/^# (.+)$/gm,"<h1>$1</h1>");
 s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank">$1</a>').replace(/\n/g,"<br>");
 blocks.forEach(function(b,i){s=s.replace("@@BLOCK"+i+"@@",b)});return s;
}
function addBubble(role,text,image,animate){
 var wrap=document.createElement("div");wrap.className="message "+role;var bw=document.createElement("div");bw.className="bubbleWrap";var b=document.createElement("div");b.className="bubble markdown";
 if(image){var im=document.createElement("img");im.className="messageImage";im.src=image;b.appendChild(im)}
 var content=document.createElement("span");content.innerHTML=animate?'<span class="typingDots"><i></i><i></i><i></i></span>':markdown(text);b.appendChild(content);bw.appendChild(b);
 if(role==="assistant"&&!animate){var actions=document.createElement("div");actions.className="messageActions";var more=document.createElement("button");more.textContent="•••";more.onclick=function(){selectedAssistantText=text;show(messageMenu)};actions.appendChild(more);bw.appendChild(actions)}
 wrap.appendChild(bw);messages.appendChild(wrap);return {bubble:b,content:content,wrap:wrap};
}
function scrollBottom(){requestAnimationFrame(function(){messages.scrollTop=messages.scrollHeight})}
function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,126)+"px";input.style.overflowY=input.scrollHeight>126?"auto":"hidden"}
function updateSend(){send.disabled=running||(!input.value.trim()&&!pendingImage);send.textContent=running?"■":"↑"}
function setKeyboard(){var h=window.visualViewport?window.visualViewport.height:window.innerHeight;document.body.classList.toggle("keyboard-open",window.innerHeight-h>120)}
if(window.visualViewport)window.visualViewport.addEventListener("resize",function(){setKeyboard();scrollBottom()});

menu.onclick=function(){renderSidebar();show(sidebarOverlay)};closeSidebar.onclick=function(){hide(sidebarOverlay)};sidebarOverlay.onclick=function(e){if(e.target===sidebarOverlay)hide(sidebarOverlay)};sidebar.onclick=function(e){e.stopPropagation()};
newChat.onclick=function(){activeId=null;renderChat();hide(sidebarOverlay);input.focus()};chatSearch.oninput=function(){renderSidebar(this.value)};
settings.onclick=function(){show(settingsOverlay)};closeSettings.onclick=function(){hide(settingsOverlay)};settingsOverlay.onclick=function(e){if(e.target===settingsOverlay)hide(settingsOverlay)};settingsPanel.onclick=function(e){e.stopPropagation()};
saveSettings.onclick=function(){if(!apiInput.value.trim()){alert("Enter your OpenAI API key.");return}apiKey=apiInput.value.trim();model=modelSelect.value;instructions=systemPrompt.value.trim();showUsage=usageToggle.checked;set("openai_api_key",apiKey);set("openai_model",model);set("system_prompt",instructions);set("show_usage",showUsage?"1":"0");headerModel.textContent=modelName(model);hide(settingsOverlay);renderUsage()};
modelButton.onclick=function(){show(modelOverlay)};modelOverlay.onclick=function(e){if(e.target===modelOverlay)hide(modelOverlay)};modelPanel.onclick=function(e){e.stopPropagation()};
Array.prototype.forEach.call(document.querySelectorAll(".modelChoice"),function(btn){btn.onclick=function(){model=this.getAttribute("data-model");modelSelect.value=model;headerModel.textContent=modelName(model);set("openai_model",model);hide(modelOverlay)}});

attach.onclick=function(){picker.click()};picker.onchange=function(){var f=this.files&&this.files[0];if(!f)return;if(f.size>6*1024*1024){alert("Choose an image under 6 MB.");this.value="";return}var r=new FileReader();r.onload=function(){pendingImage=r.result;renderAttachment();updateSend()};r.readAsDataURL(f)};
function renderAttachment(){if(!pendingImage){preview.classList.add("hidden");preview.innerHTML="";return}preview.classList.remove("hidden");preview.innerHTML='<div class="attachmentCard"><img src="'+pendingImage+'"><span>Image attached</span><button id="removeAttachment">✕</button></div>';$("removeAttachment").onclick=function(){pendingImage=null;picker.value="";renderAttachment();updateSend()}}

input.oninput=function(){resize();updateSend()};input.onkeydown=function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}};send.onclick=function(){running?stopGeneration():sendMessage()};
function buildInput(c){
 return c.messages.map(function(m){if(m.role==="user"&&m.image){return {role:"user",content:[{type:"input_text",text:m.text||"Describe this image."},{type:"input_image",image_url:m.image}]}}return {role:m.role,content:m.text}});
}
function extract(data){var out="";(data.output||[]).forEach(function(i){(i.content||[]).forEach(function(x){if(x.type==="output_text")out+=x.text||""})});return out}
async function sendMessage(){
 var text=input.value.trim(),image=pendingImage;if(!text&&!image)return;if(!apiKey){show(settingsOverlay);return}
 var c=chat()||makeChat();if(c.messages.length===0)c.title=titleFrom(text||"Image chat");
 c.messages.push({role:"user",text:text,image:image||null});c.updated=Date.now();persist();input.value="";pendingImage=null;picker.value="";renderAttachment();resize();renderChat();
 var loading=addBubble("assistant","",null,true);running=true;updateSend();controller=new AbortController();
 try{
  var body={model:model,input:buildInput(c),store:false};if(instructions)body.instructions=instructions;
  var response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},body:JSON.stringify(body),signal:controller.signal});
  var data=await response.json();if(!response.ok)throw new Error(data&&data.error&&data.error.message?data.error.message:"API request failed ("+response.status+")");
  var answer=extract(data)||"The API returned no text.";loading.wrap.remove();c.messages.push({role:"assistant",text:answer});c.updated=Date.now();lastUsage=data.usage||null;persist();renderChat();renderUsage();
 }catch(e){loading.wrap.remove();if(e.name!=="AbortError"){c.messages.push({role:"assistant",text:"Error: "+(e.message||String(e))});persist();renderChat()}}
 finally{running=false;controller=null;updateSend();renderSidebar()}
}
function stopGeneration(){if(controller)controller.abort();running=false;updateSend()}
function renderUsage(){if(!showUsage||!lastUsage){usageText.textContent="AI can make mistakes.";return}var i=lastUsage.input_tokens||0,o=lastUsage.output_tokens||0,p=prices[model]||[0,0],cost=(i/1000000*p[0])+(o/1000000*p[1]);usageText.textContent=i+" in • "+o+" out • ~$"+cost.toFixed(4)}
function regenerate(){var c=chat();if(!c||!c.messages.length)return;while(c.messages.length&&c.messages[c.messages.length-1].role==="assistant")c.messages.pop();var last=c.messages.pop();if(!last)return;input.value=last.text||"";pendingImage=last.image||null;renderAttachment();persist();renderChat();sendMessage()}
copyMessage.onclick=function(){copyText(selectedAssistantText);hide(messageMenu)};retryMessage.onclick=function(){hide(messageMenu);regenerate()};shareMessage.onclick=function(){hide(messageMenu);nativeShare(selectedAssistantText)};cancelMessageMenu.onclick=function(){hide(messageMenu)};
function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).catch(function(){fallbackCopy(t)})}else fallbackCopy(t)}
function fallbackCopy(t){var ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove()}
function nativeShare(t){if(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.share){window.webkit.messageHandlers.share.postMessage(t)}else if(navigator.share){navigator.share({text:t}).catch(function(){})}else copyText(t)}
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(a){e.preventDefault();if(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.openURL)window.webkit.messageHandlers.openURL.postMessage(a.href)}});
document.addEventListener("gesturestart",function(e){e.preventDefault()});document.addEventListener("gesturechange",function(e){e.preventDefault()});
resize();updateSend();renderChat();renderSidebar();renderUsage();window.__chatGPT15Ready=true;
})();