(function(){

	
	window.pollConfig = {};

	var POLL_VIEW_URL = 'http://sports.media.daum.net/pollproxy/poll/resultpoll.daum?pid=#{pid}&output=json&sts=1&callback=?';
	var POLL_RESULT_URL = 'http://sports.media.daum.net/pollproxy/poll/resultpoll.daum?dummy=#{dummy}&pid=#{pid}&output=json&sts=1&callback=?';


	var PollController=function(options){

		var opt={
			pid : '',			//폴id
			ruri : '',			//투표후 이동할페이지
			tplId : '',			//템플릿 id
			isAnswersSort  :false, //답항 소팅여부(result에서)
			onData : null,			
			onShow : null
		};

		daum.extend(opt, options || {});
		daum.extend(this, opt);
		

		this.viewUrl = POLL_VIEW_URL.replace("#{pid}",this.pid);
		this.resultUrl = POLL_RESULT_URL.replace("#{pid}",this.pid).replace("#{dummy}", Math.floor( new Date().getTime() / 1000 ));

	};

	var m = PollController.prototype;

	m.view = function(wrap){
		this.loadData('view',wrap);
	};
	m.result = function(wrap){		
		this.loadData('result',wrap);
	};
	m.ajaxSubmit = function(pollAction, paramString, callback){
		
		new daum.Ajax().request("",{
			url : pollAction+"?dummy="+(new Date()).getTime(),
			method: "post",
			paramString : paramString,
			onsuccess: function(res){
				
				//console.log("responseText : ",res.responseText);
				var data = daum.Ajax.jsonToObject(res.responseText);
	
				//로그인체크
				if(data.code == "login_required")
				{
					if(confirm("먼저 로그인 하셔야 합니다.\n로그인 페이지로 이동 하시겠습니까?"))
					{
						top.location = "http://login.daum.net/accounts/loginform.do?category=media&url="+encodeURIComponent(location.href);
					}
				
					return;
				}						
				else if(data.code == "internal_error" || data.code == "invalid_parameter" )
				{
					var img=new Image();
					img.src="http://group1.magpie.daum.net/magpie/opencounter/Open.do?service=mediadaum&key=POLL_EXCEPTION";
					alert("일시적으로 오류가 발생하였습니다. 잠시 후 다시 이용해주세요.");
					location.reload();
					return;
				}
				
				callback.call(this,data);
	
			}.bind(this)
		});
	
	
	};	
	m.loadData= function(type,wrap){
		

		var url = this[type+'Url'];


		daum.getJSON(url, function(json){
		
			if(typeof(this.onData)=='function') this.onData.call(this,json);

			this.template = getTemplate(this.tplId);

			var poll = json.poll;
			var que = poll.questions[0],qid = que.id;

		
			window.pollConfig[this.pid] = {
				
				canVote : json.canVote,
				isLoginUser : json.isLoginUser,
				isExpire : poll.isExpire
			
			};

			var startDate = new Date();
			var endDate = new Date();
			startDate.setTime(poll.startDate);
			endDate.setTime(poll.endDate);					
			startDate=getYMD(startDate);
			endDate=getYMD(endDate);

			
			var answers = '',arr=[]; 

			if(this.isAnswersSort)
			{
				arr=json.sts.order.scopeOfQuestion[qid],length = arr.length;

			}
			else
			{
				var arr=que.answers,length = arr.length;
			}

			for(var i=0; i<length; i++)
			{
				arr[i].percent = Math.round(arr[i].voteCount / que.voteCount * 100) || 0;	
				arr[i].rank = findRank(que.id, arr[i].id , json);	
			}
			answers = arr;

			
			var data = { 

				pid : poll.id,
				qid : que.id,
				ruri : this.ruri,
				totalVoteCount : que.voteCount ,
				questionContent : que.content ,
				startDate : startDate,
				endDate :  endDate,
				answers : answers

			};
		

			wrap.innerHTML =  new daum.Template2(this.template[type]).evaluate( data );
			

			if(typeof(this.onShow)=='function') this.onShow.call(this,json);

		}.bind(this));

	};

	function getTemplate(templateId)
	{
		var tpl = $(templateId).innerHTML;
		var tplTxt = tpl.split(/<!--tpl:[^-]+-->/);
		var tplName = tpl.match(/<!--tpl:[^-]+-->/gi);
		var template = {};

		tplTxt.each(function(value,i){		
			if(i > 0) template[tplName[i-1].replace("<!--tpl:","").replace("-->","").trim()] = value.trim();

		});		
		return template;
	}
	function findRank(qid, aid, json)
	{
		
		var que = json.sts.order.scopeOfQuestion[qid];
		var length = que.length;

		for(var i=0; i<length; i++)
		{
			if(que[i].id == aid) return i+1;
		}

	}
	function getYMD(d)
	{
		return d.getFullYear() +"."+ daum.Number.fillZero((d.getMonth()+1),2) +"."+daum.Number.fillZero(d.getDate(),2);

	}


	window.PollController = PollController;
})();