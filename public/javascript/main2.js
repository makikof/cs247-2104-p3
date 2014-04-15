// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blob = null;
  var fb_instance;
  var username = null;

  $(document).ready(function(){
    
    $("#myEmojiSelector").click(function(){
      $("#yourEmojis").fadeIn();
      $("#theirEmojis").fadeOut();
    });

    $("#theirEmojiSelector").click(function(){
      $("#theirEmojis").fadeIn();
      $("#yourEmojis").fadeOut();
    });

    connect_to_chat_firebase();
    connect_webcam();
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://makikofp3.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("?");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/proto2?"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });

    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    username = window.prompt("Hi! What's your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.which == 13) {
        if(has_emotions($(this).val())){
          $('#record_vid').show();
          $('#webcam_stream').show();
          $('#send_vid').hide()
          $('#record_stream').hide();
          $('#video_chooser').modal('show');      
        }else{
          fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color, u:username});
          $(this).val("");
        }
        scroll_to_bottom(0);
      }
    });

    $('#okButton').click(function(){
      var message = username+": " +$("#submission input").val();
      fb_instance_stream.push({m:message, v:cur_video_blob, c: my_color, u:username});
      $("#submission input").val("");
      $("#record_stream").empty();
      $('#video_chooser').modal('hide');
    });

    $('#againButton').click(function(){
      $("#record_stream").empty();
      $('#record_vid').show();
      $('#webcam_stream').fadeIn();
      $('#send_vid').hide();
    });

    $('#noVideo').click(function(){
      var message = username+": " +$("#submission input").val();
      fb_instance_stream.push({m:message, c: my_color, u:username});
      $("#record_stream").empty();
      $("#submission input").val("");
      $('#video_chooser').modal('hide');
    });

    $("#addVid").click(function(){
      $('#record_vid').show();
      $('#webcam_stream').show();
      $('#send_vid').hide()
      $('#record_stream').hide();
      $('#video_chooser').modal('show'); 
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      // for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 150;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

      document.getElementById("conversation").appendChild(video);

      //Real version will check beforehand if username is unique or not
      if (data.u === username){
        display_emoji(data.v, 1);
      }else{
        display_emoji(data.v, 2);
      }
    }
  }

  function display_emoji(vid_blob, youMe){
    var emojibox;
    if(youMe==1){ //if your emoji
      emojibox = $("#yourEmojis");
    }else{ //if their emoji
      emojibox = $("#theirEmojis");
    }

    // for video element
    var video = document.createElement("video");
    video.autoplay = true;
    video.controls = false; // optional
    video.loop = true;
    video.width = 200;

    var source = document.createElement("source");
    source.src =  URL.createObjectURL(base64_to_blob(vid_blob));
    source.type =  "video/webm";

    video.appendChild(source);

    emojibox.append(video);
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
      var video_width= 320;
      var video_height= 240;
      var webcam_stream = document.getElementById('webcam_stream');
      var mainVideo = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      mainVideo = mergeProps(mainVideo, {
        controls: false,
        width: video_width,
        height: video_height,
        src: URL.createObjectURL(stream)
      });
      mainVideo.play();
      webcam_stream.appendChild(mainVideo);

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
        cur_video_blob = null;

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
        };

        $('#recordButton').click(function() {
          $(this).attr("disabled","disabled");
          $('#stopButton').removeAttr("disabled");
          mediaRecorder.start(5000);
        });

        $('#stopButton').click(function() {
          $(this).attr("disabled","disabled");
          $('#recordButton').removeAttr("disabled");
          mediaRecorder.stop();

          //Make the other things go away
          $('#record_vid').hide();
          $('#webcam_stream').hide();

          createPreviewVid();
          $('#send_vid').fadeIn();
        });
      }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  };

  function createPreviewVid() {
    if(!cur_video_blob) {
      setTimeout(createPreviewVid, 50);
      return;
    }

    var video = document.createElement("video");
    video.autoplay = true;
    video.controls = false; // optional
    video.loop = true;
    video.width = 320;
    var source = document.createElement("source");
    source.src =  URL.createObjectURL(base64_to_blob(cur_video_blob));
    video.play();
    source.type =  "video/webm";
    video.appendChild(source);
    var record_stream = document.getElementById('record_stream');
    record_stream.appendChild(video);
    $('#record_stream').fadeIn();
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
