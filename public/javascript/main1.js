// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blobs = [];
  var fb_instance;
  var last_partner;
  var partner_last_message;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://makikofp3.firebaseio.com");

    $('#noVideo').click(function(){
      var message = username+": " +$("#submission input").val();
      fb_instance_stream.push({m:message, c: my_color});
      $("#submission input").val("");
      $('#video_options').modal('hide');
    });

    $('#okay').click(function(){
      $("#submission input").val("");
      $('#video_received').modal('hide');
    });

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("?");
    console.log(url_segments);
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/proto1?"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // block until username is answered
    var username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

        // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      var message = snapshot.val();
      // if (messageFromPartner(message.m)) {
      //   partner_last_message = message.m;
      // }
      display_video_received(username, message);
      var parsed_message = parseMessage(message.m);
      last_partner = parsed_message[0];
      last_message = parsed_message[1];
      display_msg(snapshot.val());
    });

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        if(has_emotions($(this).val()) && cur_video_blobs.length > 0){
          display_video_options(fb_instance_stream, username+": " +$(this).val(), my_color);
        }else{
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
          $(this).val("");
          scroll_to_bottom(1300);
        }
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  function messageFromPartner(username, message) {
    if (!message) return false;
    var sender = message.split(":")[0];
    return sender != username;
  }

  function parseMessage(message) {
    var message = message.split(": ");
    return message;
  }

  function display_video_received(username, message) {
    if (message.v && messageFromPartner(username, message.m) && last_partner == username) {
      $('#video_received').modal('show'); 
      parsed_message = parseMessage(message.m);
      $('#received_title').text(parsed_message[0] + "'s reaction to your message \"" + last_message + "\"");
      var video = videoElement(message.v, 400);
      var body_div = document.getElementById("received_body");
      body_div.innerHTML = "";
      body_div.appendChild(video);
    }
  }


  function display_video_options(fb_instance_stream, message, color) {

    $('#video_options').modal('show');   
    var modal_div = document.getElementById("video_options");
    var body_div = document.getElementById("options_body");
    body_div.innerHTML = "";

    var video_options = cur_video_blobs.slice(0);
    for(var i=0; i<video_options.length; i++) {
      var video_span = document.createElement("span");
      video_span.className = "option";
      video_span.setAttribute("id", i);
      video_span.appendChild(videoElement(video_options[i], 150));
      body_div.appendChild(video_span);
      video_span.onclick = function() {
        var selected_video = parseInt($(this).attr("id"));
        fb_instance_stream.push({m: message, v:video_options[selected_video], c: color});
        $('#video_options').modal('hide');  
        $("#submission input").val("");
        scroll_to_bottom(1300);
      }
    }
  }


  function videoElement(data, width) {
    var video = document.createElement("video");
    video.autoplay = true;
    video.controls = false; // optional
    video.loop = true;
    video.width = width;

    var source = document.createElement("source");
    source.src =  URL.createObjectURL(base64_to_blob(data));
    source.type =  "video/webm";

    video.appendChild(source);
    return video;

    // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
    // var video = document.createElement("img");
    // video.src = URL.createObjectURL(base64_to_blob(data.v));


  }


  // creates a message node and appends it to the conversation
  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      document.getElementById("conversation").appendChild(videoElement(data.v, 120));
    }
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream_topright');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      var mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            if(cur_video_blobs.length == 3) {
              cur_video_blobs.shift();
            }
            cur_video_blobs.push(b64_data);
          });
      };
      setInterval( function() {
        mediaRecorder.stop();
        mediaRecorder.start(3000);
      }, 3000 );
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":("];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
