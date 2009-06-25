/*
Copyright (c) 2009, Stefan Lange-Hegermann
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of source.bricks nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY STEFAN LANGE-HEGERMANN ''AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL STEFAN LANGE-HEGERMANN BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var widget_version="1.2"
var sg_connection; 
var username=null;
var password=null;
var server=null;
var sender=null;
var numbers=null;
var history=[];
var contacts=[];

var GLOBALPREFS=false;

function __ (key)
{
    try {
        var ret = localizedStrings[key];
        if (ret === undefined)
            ret = key;
        return ret;
    } catch (ex) {}
    return key;
}

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
function load()
{
    dashcode.setupParts();
    updateData();
    username = getPref("username");
    password = getPref("password");
    server = getPref("server");
    sender = getPref("sender");
    contacts=fetchContacts();
    
    if (username) $('username_field').value=username;
    if (password) $('password_field').value=password;
    if (sender) $('sender_field').value=sender;
    if (!server) server='https://samurai.sipgate.net/RPC2';
    
    if (server=='https://samurai.sipgate.net/RPC2') {
        $('team_check').checked=false;
    } else {
        $('team_check').checked=true;
    }
    
    $('sms_recipients').addEvent('keyup', function(){
        if($('sms_recipients').value!="") {
            $('cross').tween('opacity', '1');
        } else {
            $('cross').tween('opacity', '0');
        }
    });
    
    $('cross').addEvent('click', function() {
        $('sms_recipients').value="";
        $('cross').tween('opacity', '0');
        $('sms_text').select();
    });
    
    new Autocompleter.Local('sms_recipients', contacts, {
        'filterSubset': true,
        'maxChoices':8,
        'minLength': 1, // We wait for at least one character
		'overflow': false,
        'injectChoice':function(token) {
            var matched=token.match(/^([^(]+)\(([^\)]+)/);
        
            var choice = new Element('li');
			
            
            if (matched && typeof matched[1] !== 'undefined' && typeof matched[2] !== 'undefined') {
                new Element('span', {'html': this.markQueryValue(matched[1])}).inject(choice);
                choice.inputValue = matched[2];
            } else {
                new Element('span', {'html': this.markQueryValue(token)}).inject(choice);
                choice.inputValue = token;
            }
			this.addChoiceEvents(choice).inject(this.choices);
        },
        'onChoice':function() {
            $('sms_text').select();
        }
    });
    
    var unid=getPref('unid', true);
    
    if (!unid) {
        console.log('setting unid');
        unid=new Date().getTime();
        setPref(unid, 'unid', true);
    }
    
    new Request.JSON({
        'url':'http://www.sourcebricks.com/assets/files/download/smsbrick_version.txt',
        'method':'get',
        'onSuccess':function(res) {
            if (res!=widget_version) {
                var nvobj=$('new_version'); 
                $('new_version').children[0].children[1].innerHTML=__('neue version: ')+res;
                $('new_version').setStyle('visibility', 'visible');
            }
        }
    }).send('unid='+unid);
    
    sg_connection=new Sipgate(server);
    initRpc();
}

function getPref(key, global)
{
    var id=widget.identifier+"-";
    if (GLOBALPREFS || global) id="";
    return widget.preferenceForKey(id+key);
}

function setPref(value, key, global)
{
    var id=widget.identifier+"-";
    if (GLOBALPREFS || global) id="";
    widget.setPreferenceForKey(value, id+key);
}

function userMessage(message, viewclass, fade_after) 
{
    if (typeof fade_after==="undefined") fade_after=10000;
    $('success_indicator').removeClass('success');
    $('success_indicator').removeClass('failure');
    
    $('success_indicator').set('text', message);
    $('success_indicator').addClass(viewclass);
    $('success_indicator').tween('opacity', '1');
    if (fade_after!==0) {
        (function(){
            $('success_indicator').tween('opacity', '0');
            $('success_indicator').removeClass(viewclass);
        }).delay(fade_after);
    }
}

function initRpc()
{
    if (username && password) {
        if (sg_connection.login(username, password)) {
            userMessage(__('logged in'), 'success');
            if (server=='https://samurai.sipgate.net/RPC2') {
                $('site_info').set('text','classic');
            } else {
                $('site_info').set('text','team');
            }
            getBalance();
            //$('sms_text').erase('disabled');
            //$('sms_recipients').erase('disabled');
            $('button').erase('disabled').set('opacity', 1);
            return;
        } else {
            userMessage(__('login failed'), 'failure');
        }
    } else {
        
        userMessage(__('enter login data'), 'failure', 0);
    }
    $('site_info').set('text','offline');
    $('button').set('disabled', true).set('opacity', 0.6);
    //$('sms_text').set('disabled', true);
    //$('sms_recipients').set('disabled', true);
}

function getBalance()
{
    if (sg_connection['is_online']==false) return;
    var r = sg_connection.call('samurai.BalanceGet');
    if (r && r['CurrentBalance']) {
        var balance=r['CurrentBalance']['TotalIncludingVat'];
       
        document.getElementById("balance_info").innerHTML=localizedStrings['Balance']+": "+formatNumber(balance, 2, ',')+' '+localizedStrings[r['CurrentBalance']['Currency']];

    }
}

function parseNumber(number)
{
    var target="";
    number=number+"";
    target=number.replace(/[^0-9+]/ig,"");
    if (target.substr(0,1)!=="0" && target.substr(0,1)!=="+") {
        return null;
    }
    if (target.substr(0,2)==="00") {
        target=target.substr(2);
    }
    if (target.substr(0,1)==="0") {
        target='49'+target.substr(1);
    }
    if (target.substr(0,1)==="+") {
        target=target.substr(1);
    }
    target="sip:"+target+"@sipgate.net";
    return target;
}
function sendSMS(rcpt, text)
{
    var target=parseNumber(rcpt);
    
    if (target===null) return false;
    if (sg_connection['is_online']==false) return false;
    
    var sms_data={
        'RemoteUri':target,
        'TOS':'text',
        'Content':text};
    
    if (sender) {
        sms_data['LocalUri']=parseNumber(sender);
    }
    
    var r = sg_connection.call('samurai.SessionInitiate', sms_data);
    
    if (r && r['StatusCode']==200) {
        return true;
    }
    
    return false;
}

function fetchContacts()
{
    var c=AddressConnect.allContacts();
    var contacts=[];
    if (!c) {
        c=[];
    }
    
    c.each(function(vcard) {
        var name=vcard.match(/FN:([^\n\r]+)/);
        var tels=vcard.match(/TEL;type=[^\n\r]+/g);
        
        if ($type(tels)=="array") tels.each(function(tel) {
            var matchtel=tel.match(/TEL;type=([^;:]+)[^:]*:([^$]+)/);
            if (matchtel && typeof matchtel[0]!=="undefined") {
                if (matchtel[1]=="CELL") contacts.push(name[1]+' ('+matchtel[2]+')');
            }
        });
    });
    
    return contacts;
}

//
// Function: remove()
// Called when the widget has been removed from the Dashboard
//
function remove()
{
    // Stop any timers to prevent CPU usage
    // Remove any preferences as needed
    // widget.setPreferenceForKey(null, dashcode.createInstancePreferenceKey("your-key"));
}

//
// Function: hide()
// Called when the widget has been hidden
//
function hide()
{
    // Stop any timers to prevent CPU usage
}

//
// Function: show()
// Called when the widget has been shown
//
function show()
{
    // Restart any timers that were stopped on hide
}

//
// Function: sync()
// Called when the widget has been synchronized with .Mac
//
function sync()
{
    // Retrieve any preference values that you need to be synchronized here
    // Use this for an instance key's value:
    // instancePreferenceValue = widget.preferenceForKey(null, dashcode.createInstancePreferenceKey("your-key"));
    //
    // Or this for global key's value:
    // globalPreferenceValue = widget.preferenceForKey(null, "your-key");
}

//
// Function: showBack(event)
// Called when the info button is clicked to show the back of the widget
//
// event: onClick event from the info button
//
function showBack(event)
{
    var front = document.getElementById("front");
    var back = document.getElementById("back");
    
    teamChange(null);
    
    if (window.widget) {
        widget.prepareForTransition("ToBack");
    }

    front.style.display = "none";
    back.style.display = "block";

    if (window.widget) {
        setTimeout('widget.performTransition();', 0);
    }
}

//
// Function: showFront(event)
// Called when the done button is clicked from the back of the widget
//
// event: onClick event from the done button
//
function showFront(event)
{
    var front = document.getElementById("front");
    var back = document.getElementById("back");
    var update=false;
    
    if (window.widget) {
        widget.prepareForTransition("ToFront");
    }

    front.style.display="block";
    back.style.display="none";

    if (window.widget) {
        setTimeout('widget.performTransition();', 0);
    }
    
    if ($('team_check').checked) {
    
        sender=$("sender_field").value;
        if (server=='https://samurai.sipgate.net/RPC2') {
            server='https://api.sipgate.net/RPC2';
            sg_connection=new Sipgate(server);
            update=true;
        }
        
    } else {
    
        sender=null;
        if (server!='https://samurai.sipgate.net/RPC2') {
            server='https://samurai.sipgate.net/RPC2';
            sg_connection=new Sipgate(server);
            update=true;
        }
    }
    
    setPref(sender, "sender");
    setPref(server, "server");
    
        // Vorzugebende Werte
    if ($("username_field").value!=username || $("password_field").value!=password) {
        username=$("username_field").value;
        setPref(username, "username");
        
        password=$("password_field").value;
        setPref(password, "password");
        update=true;
    }
    
    if (update) initRpc.delay(200);
    
}

if (window.widget) {
    widget.onremove = remove;
    widget.onhide = hide;
    widget.onshow = show;
    widget.onsync = sync;
}

function formatNumber(number, cnt, divider)
{
    if (!divider) divider=".";
    if (!cnt) cnt=2;
    
   var num = number.toFixed(cnt);
   num=num.replace('.',divider);
   return num;
}

function updateData(event)
{
    var rcpt_value=document.getElementById("sms_recipients").value;
    var rcpts=0;
    if (rcpt_value.length>0) {
        var rcpts=rcpt_value.split(',').length;
    }
    
    var txt_length=document.getElementById('sms_text').value.length;
    var cnt=0;
    if (txt_length>0) {
        cnt=1;
    }
    if (txt_length>160) {
        cnt=2;
    }
    if (txt_length>310) {
        cnt=3;
    }
    
    var price=9.9*rcpts;
    document.getElementById("price_info").innerHTML=__('Price')+": "+formatNumber(price*cnt, 1, ',')+" ct";
    document.getElementById("count_info").innerHTML=txt_length+' '+__('letters');
}


function clickSend(event)
{
    if ($('button').disabled) return;
    if (sendSMS($('sms_recipients').value, $('sms_text').value)) {
        $('sms_text').value="";
        updateData();
        userMessage(__('message sent'), 'success');
    } else {
        userMessage(__('sending failed'), 'failure');
    }
    
}


function balanceClick(event)
{
    getBalance();
}


function teamChange(event)
{
    if ($('team_check').checked) {
        $$(['#sender_label', '#sender_field', '#sender_info']).tween('opacity', '1');
        $('username_label').set('text', __('Email:'));
    } else {
        $$(['#sender_label', '#sender_field', '#sender_info']).tween('opacity', '0');
        $('username_label').set('text', __('Username:'));
    }
}


function contactsClick(event)
{
    console.log(JSON.encode(contacts));
}


function openHomepage(event)
{
    widget.openURL('http://www.sourcebricks.com/page/smsbrick.html');
}


function newVersionGet(event)
{
    widget.openURL('http://www.sourcebricks.com/page/smsbrick.html');
}
