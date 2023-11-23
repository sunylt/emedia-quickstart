
import emedia from "./sdk/EMedia_sdk-3.4.1"

const RTC_SERVER = "https://a1.easemob.com"
const APP_KEY = "easemob-demo#chatdemoui"

emedia.config({
	appkey: APP_KEY,
	isHttpDNS: false,
	restPrefix: RTC_SERVER,
	uploadStats: false,
	consoleLogger: false,
	// restPrefix: "http://172.16.163.132:12001"
	// useDeployMore:true //开启多集群部署
});

function genUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0,
				v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function $(selector){
	return document.querySelector(selector)
}

function login(username, password){
	const  appInfo = APP_KEY.split("#")
	return fetch(`${RTC_SERVER}/${appInfo[0]}/${appInfo[1]}/token`,{
		method: "post",
		mode:"cors",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ grant_type: "password", username, password})
	}).then(res => res.json())
}

function register(username, password){
	const  appInfo = APP_KEY.split("#")
	return fetch(`${RTC_SERVER}/${appInfo[0]}/${appInfo[1]}/users`,{
		method: "post",
		mode:"cors",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ username, password})
	}).then(res => res.json())
}

// 为本机创建一个随机的身份
if(localStorage.getItem("username") && localStorage.getItem("usertoken")){
	initEmedia(localStorage.getItem("username"), localStorage.getItem("usertoken"))
}else{
	const username = genUUID().replace(/\-/g, "")
	register(username, 123456).then(res => {
		localStorage.setItem("username", username)
		login(username, 123456).then(res => {
			localStorage.setItem("usertoken", res.access_token)
			initEmedia(username, res.access_token)
		})
	})
}


let roomData = null
let joinedMemebers = window.joinedMemebers = []
const params = {
	roomName: "teesroom"+ new Date().getDate(), // string 房间名称 必需
	password: "123456", // string 房间密码 必需
	role: 7,  // number 进入会议的角色 1: 观众  3:主播 必需
	config: {
			rec:false, //是否开启录制会议
			recMerge:false, //是否开启合并录制
			supportWechatMiniProgram: false //是否允许小程序加入会议
		}
}

function initEmedia(username, token){
	const memName = APP_KEY +'_'+ username;
	emedia.mgr.setIdentity(memName, token); //设置memName 、token
	emedia.mgr.onStreamAdded = function (member, stream) {
		console.log('onStreamAdded >>>', member, stream);
		if(stream.located() !== true){
			const videoTag = document.querySelector("#" + member.id)	
			emedia.mgr.subscribe(member, stream, true, true, videoTag) 
		}
		if(stream.type == 1){
			// emedia.mgr.subscribe(member, stream, true, true, )
			$("#desktopVideo").srcObject = stream.getMediaStream();
			$("#desktopVideo").play();
		}
	};
	emedia.mgr.onStreamRemoved = function (member, stream) {
		console.log('onStreamRemoved >>>',member,stream)
		// emedia.mgr.unsubscribe(stream) // 非常奇怪  调用之后就不会触发onMemberLeave/onMemberExited
	};
	emedia.mgr.onMemberJoined = function (member) {
		console.log('onMemberJoined >>>', member);
		const videoTagExist = $("#" + member.id)
			const videoTag = document.createElement("video")
			videoTag.width = "200"
			videoTag.height = "150"
			videoTag.id = member.id
			$("#roomList").appendChild(videoTag)
			joinedMemebers.push(member.id)
		// message.success(`${member.nickName || member.name} 加入了会议`);
	};
	emedia.mgr.onMemberLeave = function (member, reason, failed) {
		console.log('onMemberLeave >>>', member, reason, failed)
		const videoTag = $("#" + member.id)
		const index = joinedMemebers.indexOf(member.id)
		videoTag && $("#roomList").removeChild(videoTag)
		joinedMemebers.splice(index, 1);
		if(joinedMemebers.length === 0){
			emedia.mgr.exitConference()
		}
	}
	emedia.mgr.onConferenceExit = function (reason, failed) {
		$("#roomList").innerHTML = ""
		$("#roomInfo").innerText = ""
		joinedMemebers = []
		roomData = null
	}
}

$("#joinRoom").addEventListener("click", function(){
	emedia.mgr.joinRoom(params).then(res => {
		const roomInfo = res.ticket
		const constaints = { // 发布音频流的配置参数, Object 必需。 video或audio属性 至少存在一个
			audio: true, // 是否发布音频
			video: true  // 是否发布视频
		}
		const ext = {} // 发布流的扩展信息 Object 非必需。会议其他成员可接收到
		const videoTag = $('#localStream') //需要显示本地流的 video 标签
		roomData = res
		$("#roomInfo").innerText = roomInfo.replaceAll('\\', '');	
		emedia.mgr.publish(constaints, ext).then(pushedStream => {
			emedia.mgr.streamBindVideo(pushedStream, videoTag)
		}).catch(e => {
			console.log("error=>=>", e)
			emedia.mgr.exitConference()
		})
	})
})

$("#exitRoom").addEventListener("click", function(){
	emedia.mgr.exitConference()
})

$("#changeCamera").addEventListener("click", function(){
	roomData && emedia.mgr.switchMobileCamera(roomData.confrId)
})


$("#shareDesktop").addEventListener("click", function(){
	emedia.mgr.shareDesktopWithAudio({
		confrId: roomData.confrId,
		audio: false,
		videoTag: $("#desktopVideo")
	})
})


