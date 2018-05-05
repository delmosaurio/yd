// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const async = require('async');
const url = require('url');
const YoutubeMp3Downloader = require("youtube-mp3-downloader");
const path = require('path');
const os = require('os');

const FOLDER_DEFAULT = path.join(os.userInfo().homedir);

const pffmpeg = {
	'win32': 'bin/ffmpeg-20180504-dc7a8f7-win32-static/bin/ffmpeg.exe',
	'win64': 'bin/ffmpeg-20180504-dc7a8f7-win64-static/bin/ffmpeg.exe',
	'linux': 'bin/ffmpeg-git-20180429-64bit-static/ffmpeg'
};

const electron = require('electron').remote;
const dialog = electron.dialog;

function getffmpegPath() {
	let plat = os.platform();
	return path.join(__dirname, pffmpeg[plat]);
}

const Video = function(url, id){
	this.url = ko.observable(url);
	this.title = ko.observable('');
	this.status = ko.observable('queue');
	this.id = ko.observable(id);
	this.progress = ko.observable(0);
	this.error = ko.observable({});
	this.progressText = ko.pureComputed(() => {
		return Math.round(this.progress()) + '%';
	}, this);
};



const ViewModel = function() {
	this.url = ko.observable('');
	this.error = ko.observable('');
	this.list = ko.observableArray([]);
	this.downPath = ko.observable(FOLDER_DEFAULT);

	let ops = {
		"ffmpegPath": getffmpegPath(), 					// Where is the FFmpeg binary located?
		"outputPath": this.downPath(),          // Where should the downloaded and encoded files be stored?
		"youtubeVideoQuality": "highest",       // What video quality should be used?
		"queueParallelism": 2,                  // How many parallel downloads/encodes should be started?
		"progressTimeout": 2000                 // How long should be the interval of the progress reports
	};
	
	this.folderHandler = () => {
		let d = dialog.showOpenDialog({
			title: 'Carpeta de descargas',
			defaultPath: this.downPath(),
			properties: ['openDirectory']
		});

		this.downPath(d || '');
	};
	
	this.queueVideo = (video) => {
		this.list.push(video);

		video.status('loading');
		video.yd = new YoutubeMp3Downloader(ops);

		//Download video and save as MP3 file
		video.yd.download(video.id());

		video.yd.on("finished", function(err, data) {
			video.status('complete');
			video.title(data.videoTitle);
		});

		video.yd.on("error", function(error) {
			video.status('error');
			video.error(error);
		});

		video.yd.on("progress", function(data) {
			video.status('downloading');
			video.progress(data.progress.percentage);
			//video.progress.valueHasMutated();
			//console.log(data)
		});
	};

	this.downHanlder = (event) => {
		this.error('');
		
		try {
			let u = new URL(this.url());
			let isYoutube = /(www\.)?youtube\.com/ig;
			if (!isYoutube.test(u.hostname)){
				throw new Error('La url no pertenece a YouTube')
			}
			
			this.queueVideo(new Video(this.url(), u.searchParams.get('v')))

			this.url('');
		} catch (e) {
			if (/Invalid URL/ig.test(e.message)) {
				return this.error('URL no es valida');
			}
			this.error(e.message);
		}
	};
};
 
ko.applyBindings(new ViewModel());