const { Client, GatewayIntentBits, Partials } = require("discord.js");
require("dotenv").config();
const TOKEN = process.env.DISCORD_TOKEN;
const sessions = new Map();
const descriptions = {
  help:"List commands or describe one command.", clear:"Clear the simulated screen.", exit:"End your terminal session.",
  pwd:"Print the current directory.", ls:"List directory contents; supports -a and -l.", cd:"Change directory.",
  tree:"Display a directory tree.", find:"Find files by name.", stat:"Show metadata.", file:"Identify a file type.",
  touch:"Create files.", mkdir:"Create directories.", rmdir:"Remove empty directories.", rm:"Remove files and directories.",
  cp:"Copy files or directories.", mv:"Move or rename entries.", cat:"Print file contents.", echo:"Print or write text.",
  head:"Show first lines.", tail:"Show last lines.", wc:"Count lines and words.", grep:"Search file contents.",
  nano:"Show a simulated editor.", chmod:"Change simulated permissions.", df:"Show disk usage.", du:"Show file size.",
  free:"Show memory usage.", uname:"Show OS information.", hostname:"Show machine hostname.", whoami:"Show current user.",
  id:"Show user IDs.", date:"Show date.", uptime:"Show session uptime.", cal:"Show a calendar.",
  env:"List variables.", printenv:"Print variable values.", export:"Set a variable.", history:"Show command history.",
  ps:"List fake processes.", top:"Show system monitor.", kill:"Stop a fake process.", jobs:"List fake jobs.",
  ping:"Show simulated ping results.", ip:"Show fake interfaces.", ifconfig:"Alias for ip.", ipconfig:"Alias for ip.",
  nslookup:"Show fake DNS results.", curl:"Show fake HTTP output.", wget:"Simulate a download.", traceroute:"Show a fake route.",
  netstat:"Show fake sockets.", ss:"Alias for netstat.", systemctl:"Manage simulated services.", service:"Alias for systemctl.",
  reboot:"Simulated reboot only.", shutdown:"Simulated shutdown only.", neofetch:"Show a system summary.",
  fastfetch:"Show compact system information.", banner:"Print a banner.", fortune:"Print a quote.", cowsay:"ASCII cow output.",
  sl:"Display an ASCII train.", matrix:"Display fake Matrix output.", hack:"Show a harmless fake access sequence.",
  scan:"Show fictional open ports.", ssh:"Show simulated SSH response.", man:"Show a manual page.",
  which:"Show virtual command path.", type:"Describe a command.", seq:"Print a short sequence.", rev:"Reverse text.",
  sort:"Sort file lines.", uniq:"Remove adjacent duplicates.", factor:"Factor an integer.", cut:"Extract delimited fields."
};
const groups = [
  ["Shell",["help","clear","exit","pwd","ls","cd","tree","history","which","type","man"]],
  ["Files",["find","stat","file","touch","mkdir","rmdir","rm","cp","mv","cat","echo","head","tail","wc","grep","nano","chmod","sort","uniq","cut"]],
  ["System",["df","du","free","uname","hostname","whoami","id","date","uptime","cal","env","printenv","export","ps","top","kill","jobs","reboot","shutdown"]],
  ["Network (simulated)",["ping","ip","ifconfig","ipconfig","nslookup","curl","wget","traceroute","netstat","ss","ssh","scan"]],
  ["Utilities",["systemctl","service","neofetch","fastfetch","banner","fortune","cowsay","sl","matrix","hack","seq","rev","factor"]]
];
const client = new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.DirectMessages,GatewayIntentBits.MessageContent],partials:[Partials.Channel]});
const makeDir=()=>({type:"dir",children:new Map(),mode:"drwxr-xr-x",modified:Date.now()});
const makeFile=(content)=>({type:"file",content:content||"",mode:"-rw-r--r--",modified:Date.now()});
function seed(root,path,node){const parts=path.split("/").filter(Boolean);let cur=root;for(let i=0;i<parts.length-1;i++){if(!cur.children.has(parts[i]))cur.children.set(parts[i],makeDir());cur=cur.children.get(parts[i]);}cur.children.set(parts[parts.length-1],node);}
function newSession(){
  const fs=makeDir();
  seed(fs,"/home/teal",makeDir());seed(fs,"/home/teal/Documents",makeDir());seed(fs,"/home/teal/Downloads",makeDir());seed(fs,"/home/teal/Projects",makeDir());
  seed(fs,"/home/teal/README.txt",makeFile("Welcome to TealOS. This is a simulated terminal.\nTry help to see commands.\n"));
  seed(fs,"/home/teal/Documents/notes.txt",makeFile("This virtual filesystem exists only for this Discord session.\n"));
  seed(fs,"/home/teal/Projects/hello.js",makeFile("console.log('Hello from TealOS');\n"));
  seed(fs,"/etc",makeDir());seed(fs,"/etc/os-release",makeFile("NAME=\"TealOS\"\nVERSION=\"1.0 (Simulation)\"\nID=tealos\n"));
  seed(fs,"/var",makeDir());seed(fs,"/var/log",makeDir());seed(fs,"/var/log/syslog",makeFile("[ OK ] Virtual services initialized.\n"));
  seed(fs,"/tmp",makeDir());seed(fs,"/usr",makeDir());seed(fs,"/usr/bin",makeDir());
  return {username:"teal",hostname:"teal-pc",cwd:"/home/teal",oldCwd:"/home/teal",fs,started:Date.now(),history:[],
    vars:{USER:"teal",HOME:"/home/teal",SHELL:"/bin/bash",PATH:"/usr/local/bin:/usr/bin:/bin",PWD:"/home/teal",HOSTNAME:"teal-pc",TERM:"xterm-256color"},
    services:{"ssh.service":"active","networking.service":"active","cron.service":"active","nginx.service":"inactive"},
    processes:[{pid:1,user:"root",cmd:"/sbin/init"},{pid:214,user:"root",cmd:"network-manager"},{pid:389,user:"teal",cmd:"/bin/bash"},{pid:511,user:"teal",cmd:"terminal-session"}]};
}

function resolve(path,cwd){let p=path||cwd;if(p==="~")p="/home/teal";else if(p.startsWith("~/"))p="/home/teal/"+p.slice(2);else if(!p.startsWith("/"))p=cwd.replace(/\/+$/,"")+"/"+p;const out=[];for(const bit of p.split("/")){if(!bit||bit===".")continue;if(bit==="..")out.pop();else out.push(bit);}return "/"+out.join("/");}
function get(s,path){const p=resolve(path,s.cwd);if(p==="/")return s.fs;let n=s.fs;for(const bit of p.split("/").filter(Boolean)){if(!n||n.type!=="dir")return null;n=n.children.get(bit);if(!n)return null;}return n;}
function parent(s,path){const p=resolve(path,s.cwd);if(p==="/")return null;const bits=p.split("/").filter(Boolean),name=bits.pop(),dirNode=get(s,"/"+bits.join("/"));return dirNode&&dirNode.type==="dir"?{dir:dirNode,name,path:p}:null;}
function size(n){if(!n)return 0;if(n.type==="file")return Buffer.byteLength(n.content,"utf8");let total=0;for(const c of n.children.values())total+=size(c);return total;}
function human(n){return n<1024?n+" B":n<1048576?(n/1024).toFixed(1)+" KB":(n/1048576).toFixed(1)+" MB";}
function clone(n){if(n.type==="file")return makeFile(n.content);const c=makeDir();for(const [k,v] of n.children)c.children.set(k,clone(v));return c;}
function tokenize(input){const out=[];let word="",quote=null,escape=false,active=false;for(const c of input){if(escape){word+=c;escape=false;active=true;}else if(c==="\\"&&quote!=="'"){escape=true;active=true;}else if(quote){if(c===quote)quote=null;else word+=c;active=true;}else if(c==="\""||c==="'"){quote=c;active=true;}else if(/\s/.test(c)){if(active)out.push(word);word="";active=false;}else{word+=c;active=true;}}if(escape)word+="\\";if(quote)throw new Error("Unclosed quote. Close it and try again.");if(active)out.push(word);return out;}
function prompt(s){const p=s.cwd==="/home/teal"?"~":s.cwd.startsWith("/home/teal/")?"~"+s.cwd.slice(10):s.cwd;return s.username+"@"+s.hostname+":"+p+"$";}
function write(s,path,text,append){const p=parent(s,path);if(!p)return "cannot write '"+path+"': parent directory does not exist";const old=p.dir.children.get(p.name);if(old&&old.type!=="file")return path+": Is a directory";if(old){old.content=append?old.content+text:text;old.modified=Date.now();}else p.dir.children.set(p.name,makeFile(text));return null;}
function readLines(s,path){const n=get(s,path);if(!n)return {error:path+": No such file or directory"};if(n.type!=="file")return {error:path+": Is a directory"};return {lines:n.content.replace(/\n$/,"").split("\n")};}
function walk(n,prefix,out,depth){if(depth>4||n.type!=="dir")return;const entries=Array.from(n.children.entries()).sort((a,b)=>a[0].localeCompare(b[0]));entries.forEach(([name,child],i)=>{const last=i===entries.length-1;out.push(prefix+(last?"└── ":"├── ")+name+(child.type==="dir"?"/":""));if(child.type==="dir")walk(child,prefix+(last?"    ":"│   "),out,depth+1);});}
function calendar(month,year){const first=new Date(year,month-1,1),days=new Date(year,month,0).getDate();let out=first.toLocaleString("en-US",{month:"long"})+" "+year+"\nSu Mo Tu We Th Fr Sa\n"+"   ".repeat(first.getDay());for(let d=1;d<=days;d++){out+=String(d).padStart(2," ")+" ";if((first.getDay()+d)%7===0)out+="\n";}return out;}

function simulate(s,input){
  let args;try{args=tokenize(input);}catch(e){return {text:"bash: "+e.message};}
  if(!args.length)return {text:""};
  const cmd=args.shift().toLowerCase();s.history.push(input);if(s.history.length>100)s.history.shift();
  switch(cmd){
    case "help":{
      if(args[0]){const name=args[0].toLowerCase();return {text:descriptions[name]?name+"\n"+descriptions[name]+"\nUsage: "+name+" [arguments]":"help: no manual entry for "+name};}
      const out=["TealOS shell commands","Type help <command> for details.","Available commands: "+Object.keys(descriptions).length,""];
      for(const [group,names] of groups){out.push("["+group+"]");for(const name of names)out.push("  "+name.padEnd(13)+descriptions[name]);out.push("");}
      out.push("All networking, processes and system operations are simulated.");return {text:out.join("\n")};
    }
    case "clear":return {text:"\n\n\n\n\n"+prompt(s)+"  [screen cleared]"};
    case "exit":return {text:"logout\nTerminal session closed.",close:true};
    case "pwd":return {text:s.cwd};
    case "ls":{
      const show=args.some(x=>["-a","-la","-al"].includes(x)),long=args.some(x=>["-l","-la","-al"].includes(x));
      const path=args.filter(x=>!x.startsWith("-")).pop()||s.cwd,node=get(s,path);
      if(!node)return {text:"ls: cannot access '"+path+"': No such file or directory"};
      if(node.type==="file")return {text:path};
      const names=Array.from(node.children.keys()).sort();if(show)names.unshift("..",".");
      return {text:names.map(name=>{const child=node.children.get(name);return long?(child?child.mode:node.mode)+" 1 teal teal "+(child?size(child):4096)+" "+name:(name==="."||name==="..")?name:child.type==="dir"?name+"/":name;}).join("\n")||"(empty directory)"};
    }
    case "cd":{
      const path=args[0]==="-"?s.oldCwd:resolve(args[0]||"~",s.cwd),node=get(s,path);
      if(!node)return {text:"bash: cd: "+(args[0]||"~")+": No such directory"};
      if(node.type!=="dir")return {text:"bash: cd: Not a directory"};
      s.oldCwd=s.cwd;s.cwd=path;s.vars.PWD=path;return {text:""};
    }
    case "tree":{
      const path=args[0]||s.cwd,node=get(s,path);if(!node)return {text:"tree: "+path+": No such file"};
      if(node.type==="file")return {text:path};const out=[path];walk(node,"",out,0);return {text:out.join("\n")+"\n"+(out.length-1)+" entries"};
    }
    case "find":{
      const start=args[0]&&args[0]!=="-name"?args[0]:".",index=args.indexOf("-name"),pattern=index>=0?args[index+1]:null,path=resolve(start,s.cwd),node=get(s,path);
      if(!node)return {text:"find: "+start+": No such directory"};
      const found=[];const visit=(entry,p)=>{const name=p.split("/").pop()||"/";if(!pattern||name.includes(pattern))found.push(p);if(entry.type==="dir")for(const [k,v] of entry.children)visit(v,p==="/"?"/"+k:p+"/"+k);};
      visit(node,path);return {text:found.join("\n")||"No matches."};
    }
    case "stat":{
      if(!args[0])return {text:"Usage: stat <path>"};const node=get(s,args[0]);
      return {text:!node?"stat: cannot stat '"+args[0]+"': No such file":"File: "+args[0]+"\nType: "+node.type+"\nSize: "+size(node)+" bytes\nMode: "+node.mode+"\nModified: "+new Date(node.modified).toString()};
    }
    case "file":{
      if(!args[0])return {text:"Usage: file <path>"};const node=get(s,args[0]);
      return {text:!node?args[0]+": cannot open":args[0]+": "+(node.type==="dir"?"directory":"ASCII text")};
    }
    case "touch":{
      if(!args.length)return {text:"Usage: touch <file>"};const errors=[];
      for(const path of args){const p=parent(s,path);if(!p)errors.push("touch: "+path+": no such directory");else if(p.dir.children.get(p.name)?.type==="dir")errors.push("touch: "+path+": Is a directory");else if(p.dir.children.has(p.name))p.dir.children.get(p.name).modified=Date.now();else p.dir.children.set(p.name,makeFile(""));}
      return {text:errors.join("\n")};
    }
    case "mkdir":{
      const recursive=args.includes("-p"),paths=args.filter(x=>x!=="-p");if(!paths.length)return {text:"Usage: mkdir [-p] <directory>"};const errors=[];
      for(const path of paths){const full=resolve(path,s.cwd);if(get(s,full)){if(!recursive)errors.push("mkdir: "+path+": File exists");continue;}
        if(recursive){let cur=s.fs;for(const bit of full.split("/").filter(Boolean)){if(!cur.children.has(bit))cur.children.set(bit,makeDir());cur=cur.children.get(bit);if(cur.type!=="dir"){errors.push("mkdir: "+path+": Not a directory");break;}}}
        else{const p=parent(s,full);if(!p)errors.push("mkdir: "+path+": No parent directory");else p.dir.children.set(p.name,makeDir());}}
      return {text:errors.join("\n")};
    }
    case "rmdir":{
      if(!args[0])return {text:"Usage: rmdir <empty-directory>"};const p=parent(s,args[0]),node=get(s,args[0]);
      if(!p||!node)return {text:"rmdir: "+args[0]+": No such directory"};if(node.type!=="dir")return {text:"rmdir: Not a directory"};
      if(node.children.size)return {text:"rmdir: Directory not empty"};p.dir.children.delete(p.name);return {text:""};
    }
    case "rm":{
      const recursive=args.some(x=>["-r","-rf","-fr"].includes(x)),force=args.some(x=>["-f","-rf","-fr"].includes(x)),paths=args.filter(x=>!x.startsWith("-"));
      if(!paths.length)return {text:"Usage: rm [-r] <path>"};const errors=[];
      for(const path of paths){const full=resolve(path,s.cwd),p=parent(s,full),node=get(s,full);
        if(!p||!node){if(!force)errors.push("rm: "+path+": No such file");continue;}
        if(full==="/"||full==="/home/teal"){errors.push("rm: refusing to remove protected directory");continue;}
        if(node.type==="dir"&&!recursive){errors.push("rm: "+path+": Is a directory (use -r)");continue;}p.dir.children.delete(p.name);}
      return {text:errors.join("\n")};
    }
    case "cp":case "mv":{
      const recursive=args.includes("-r")||args.includes("-R"),paths=args.filter(x=>!x.startsWith("-"));
      if(paths.length<2)return {text:"Usage: "+cmd+" [-r] <source> <destination>"};
      const src=resolve(paths[0],s.cwd),dest=resolve(paths[1],s.cwd),node=get(s,src),target=get(s,dest);
      if(!node)return {text:cmd+": source not found"};if(node.type==="dir"&&!recursive)return {text:cmd+": use -r for directories"};
      if(src==="/"||src==="/home/teal")return {text:cmd+": protected directory"};
      const finalPath=target&&target.type==="dir"?dest+"/"+src.split("/").pop():dest,p=parent(s,finalPath);
      if(!p)return {text:cmd+": destination directory does not exist"};if(cmd==="mv"&&finalPath.startsWith(src+"/"))return {text:"mv: cannot move a directory into itself"};
      p.dir.children.set(p.name,clone(node));if(cmd==="mv"){const old=parent(s,src);if(old)old.dir.children.delete(old.name);}return {text:""};
    }

    case "cat":{
      if(!args.length)return {text:"Usage: cat <file>"};const out=[];
      for(const path of args){const node=get(s,path);if(!node)out.push("cat: "+path+": No such file");else if(node.type!=="file")out.push("cat: "+path+": Is a directory");else out.push(node.content.replace(/\n$/,""));}
      return {text:out.join("\n")};
    }
    case "echo":{
      const index=args.findIndex(x=>x===">"||x===">>"),value=(index<0?args:args.slice(0,index)).join(" ");
      if(index>=0){if(!args[index+1])return {text:"bash: syntax error near unexpected token 'newline'"};return {text:write(s,args[index+1],value+"\n",args[index]===">>")||""};}
      return {text:value};
    }
    case "head":case "tail":{
      let count=10,path=args[0];if(args[0]==="-n"){count=Math.max(1,Math.min(100,Number(args[1])||10));path=args[2];}
      if(!path)return {text:"Usage: "+cmd+" [-n count] <file>"};const result=readLines(s,path);if(result.error)return {text:cmd+": "+result.error};
      return {text:(cmd==="head"?result.lines.slice(0,count):result.lines.slice(-count)).join("\n")};
    }
    case "wc":{
      if(!args[0])return {text:"Usage: wc <file>"};const node=get(s,args[0]);if(!node||node.type!=="file")return {text:"wc: cannot read "+args[0]};
      const text=node.content,lines=text?text.split("\n").length-(text.endsWith("\n")?1:0):0,words=(text.match(/\S+/g)||[]).length;
      return {text:lines+" lines  "+words+" words  "+Array.from(text).length+" chars  "+args[0]};
    }
    case "grep":{
      if(args.length<2)return {text:"Usage: grep <text> <file>"};const result=readLines(s,args[1]);if(result.error)return {text:"grep: "+result.error};
      return {text:result.lines.filter(line=>line.includes(args[0])).join("\n")||"No matches found."};
    }
    case "nano":{
      if(!args[0])return {text:"Usage: nano <file>"};const p=parent(s,args[0]);if(!p)return {text:"nano: parent directory not found"};
      if(!p.dir.children.has(p.name))p.dir.children.set(p.name,makeFile(""));const node=p.dir.children.get(p.name);
      if(node.type!=="file")return {text:"nano: Is a directory"};
      return {text:"GNU nano 7.2 (simulation) - "+args[0]+"\n\n"+(node.content||"[ New File ]")+"\n\nRead-only preview. Write with: echo \"text\" > "+args[0]};
    }
    case "chmod":{
      if(args.length<2)return {text:"Usage: chmod <mode> <path>"};const node=get(s,args[1]);if(!node)return {text:"chmod: cannot access '"+args[1]+"': No such file"};
      if(!/^[0-7]{3,4}$/.test(args[0]))return {text:"chmod: invalid mode"};
      node.mode=(node.type==="dir"?"d":"-")+args[0].slice(-3).split("").map(x=>{const n=Number(x);return (n&4?"r":"-")+(n&2?"w":"-")+(n&1?"x":"-");}).join("");return {text:""};
    }
    case "df":return {text:"Filesystem      Size  Used  Avail Use% Mounted on\ntealos-root      20G   2.4G  17.6G  12% /\nhome              5G   "+human(size(get(s,"/home/teal")))+"  4.9G   2% /home"};
    case "du":{
      const path=args[0]||".",node=get(s,path);return {text:node?human(size(node))+"\t"+path:"du: "+path+": No such file"};
    }
    case "free":return {text:"              total        used        free\nMem:           8192        2460        5732\nSwap:          2048           0        2048\n(simulated memory statistics)"};
    case "uname":return {text:args.includes("-a")?"TealOS teal-pc 6.8.0-teal x86_64 GNU/Linux (simulation)":"TealOS"};
    case "hostname":return {text:s.hostname};
    case "whoami":return {text:s.username};
    case "id":return {text:"uid=1000(teal) gid=1000(teal) groups=1000(teal),27(sudo),100(users)"};
    case "date":return {text:new Date().toString()};
    case "uptime":{
      const t=Math.floor((Date.now()-s.started)/1000);return {text:"up "+Math.floor(t/3600)+" hours, "+Math.floor(t%3600/60)+" minutes, 1 user, load average: 0.18, 0.12, 0.08"};
    }
    case "cal":{
      const now=new Date(),month=args[0]?Number(args[0]):now.getMonth()+1,year=args[1]?Number(args[1]):now.getFullYear();
      if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<1)return {text:"Usage: cal [month 1-12] [year]"};
      return {text:calendar(month,year)};
    }
    case "env":case "printenv":return {text:args[0]?(s.vars[args[0]]||""):Object.entries(s.vars).map(([k,v])=>k+"="+v).join("\n")};
    case "export":{
      const value=args.join(" "),index=value.indexOf("=");if(index<1)return {text:"Usage: export NAME=value"};const name=value.slice(0,index);
      if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))return {text:"export: not a valid identifier"};s.vars[name]=value.slice(index+1);return {text:""};
    }
    case "history":return {text:s.history.map((value,index)=>String(index+1).padStart(4)+"  "+value).join("\n")||"No commands yet."};
    case "ps":return {text:" PID  USER     COMMAND\n"+s.processes.map(p=>String(p.pid).padStart(4)+"  "+p.user.padEnd(8)+" "+p.cmd).join("\n")};
    case "top":return {text:"top - "+new Date().toLocaleTimeString()+"  tasks: "+s.processes.length+"  load average: 0.18, 0.12, 0.08\nPID   USER     COMMAND\n"+s.processes.map(p=>p.pid+"  "+p.user+"  "+p.cmd).join("\n")};
    case "kill":{
      const pid=Number(args[0]),index=s.processes.findIndex(p=>p.pid===pid);if(index<0)return {text:"kill: no such simulated process"};
      if(pid===1||pid===511)return {text:"kill: operation not permitted"};s.processes.splice(index,1);return {text:"Process "+pid+" terminated (simulation)."};
    }
    case "jobs":return {text:"No jobs."};
    case "ping":{
      const host=args.filter(x=>!x.startsWith("-"))[0];if(!host)return {text:"Usage: ping <host>"};
      const ci=args.indexOf("-c"),count=ci>=0?Math.max(1,Math.min(4,Number(args[ci+1])||4)):4;
      const out=["PING "+host+" (203.0.113.10) 56(84) bytes of data."];for(let i=1;i<=count;i++)out.push("64 bytes from 203.0.113.10: icmp_seq="+i+" ttl=56 time="+(18+i*3)+".0 ms");
      out.push("\n"+count+" packets transmitted, "+count+" received, 0% packet loss","(simulated; no packets sent)");return {text:out.join("\n")};
    }
    case "ip":case "ifconfig":case "ipconfig":return {text:"eth0: flags=4163<UP,BROADCAST,RUNNING>  mtu 1500\n        inet 192.0.2.25  netmask 255.255.255.0\n        ether 02:42:ac:11:00:02\nlo:     inet 127.0.0.1  netmask 255.0.0.0\n(simulated network interfaces)"};
    case "nslookup":return {text:args[0]?"Server: 192.0.2.1\nName: "+args[0]+"\nAddress: 203.0.113.10\n(simulated DNS result)":"Usage: nslookup <hostname>"};
    case "curl":return {text:args[0]?"* Trying 203.0.113.10:443...\n> GET / HTTP/1.1\n< HTTP/1.1 200 OK\n<html><body><h1>TealOS simulated response</h1></body></html>\n(no network request was made)":"Usage: curl <url>"};
    case "wget":{
      const url=args.filter(x=>!x.startsWith("-")).pop();if(!url)return {text:"Usage: wget <url>"};
      const name=args.includes("-O")?args[args.indexOf("-O")+1]:(url.split("/").pop()||"index.html");
      const error=write(s,name,"Simulated download from "+url+"\nNo network request was made.\n",false);
      return {text:error||"HTTP request: 200 OK\nSaved '"+name+"' (simulated)."};
    }
    case "traceroute":return {text:args[0]?"traceroute to "+args[0]+"\n 1  192.0.2.1       1.2 ms\n 2  198.51.100.1   12.4 ms\n 3  203.0.113.10   24.2 ms\n(simulated route; no packets sent)":"Usage: traceroute <host>"};
    case "netstat":case "ss":return {text:"Netid State   Local Address:Port   Peer Address:Port\ntcp   LISTEN  0.0.0.0:22           0.0.0.0:*\ntcp   LISTEN  127.0.0.1:27017      0.0.0.0:*\ntcp   ESTAB   192.0.2.25:443       203.0.113.8:52144\n(simulated socket table)"};
    case "systemctl":case "service":{
      const action=args[0]||"status",unit=args[1]||"ssh.service";
      if(action==="list-units")return {text:Object.entries(s.services).map(([name,state])=>name.padEnd(22)+" loaded "+state).join("\n")};
      if(!["status","start","stop","restart","enable","disable"].includes(action))return {text:"Usage: systemctl <status|list-units|start|stop|restart|enable|disable> [service]"};
      if(!(unit in s.services))return {text:"Unit "+unit+" could not be found."};
      if(["start","restart","enable"].includes(action))s.services[unit]="active";
      if(["stop","disable"].includes(action))s.services[unit]="inactive";
      return {text:"● "+unit+"\n   Loaded: loaded (simulation)\n   Active: "+s.services[unit]+"\nNo real service was changed."};
    }
    case "reboot":case "shutdown":return {text:"System "+(cmd==="reboot"?"restart":"shutdown")+" requested.\nSimulation only: your PC and bot are untouched. Session remains active."};
    case "neofetch":case "fastfetch":return {text:"       .----.       teal@teal-pc\n      / .--. \\      ----------------\n     | |    | |     OS: TealOS 1.0 (Simulation)\n     | |____| |     Kernel: 6.8.0-teal\n      \\______/      Shell: bash 5.2\n                    CPU: Virtual x86_64\n                    Memory: 2460 / 8192 MiB\n                    Filesystem: in-memory\n                    Uptime: "+Math.floor((Date.now()-s.started)/1000)+" seconds"};
    case "banner":return {text:"========================================\n "+(args.join(" ")||"TEAL OS").toUpperCase().slice(0,30)+"\n========================================"};
    case "fortune":{
      const quotes=["There is no place like 127.0.0.1.","It works on my machine.","First solve the problem, then write the code.","A clean terminal is a happy terminal.","Talk is cheap. Show me the code."];
      return {text:quotes[Math.floor(Math.random()*quotes.length)]};
    }
    case "cowsay":{
      const value=(args.join(" ")||"Moo!").slice(0,100),border="-".repeat(value.length+2);
      return {text:" "+border+"\n< "+value+" >\n "+border+"\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||"};
    }
    case "sl":return {text:"      ====        ________                ___________\n  _D _|  |_______/        \\__I_I______==__|_________|\n   |(_)---  |   H\\________/ |   |        =|___ ___|\n(ASCII train snapshot; no real process started.)"};
    case "matrix":return {text:"01001000 01100101 01101100 01101100 01101111\n10110101 00101101 11001010 01110010 01010101\n00110110 11100010 01001001 10101100 01001010\nWake up, user. The terminal has you.\n(simulated visual effect)"};
    case "hack":return {text:"[*] Initializing secure shell...\n[+] Loading virtual modules ........ OK\n[+] Establishing encrypted tunnel ... OK\n[+] Checking permissions ........... OK\n[*] Decrypting demo payload ........ 100%\n[+] ACCESS GRANTED (SIMULATION)\nNo system was accessed. This is roleplay only."};
    case "scan":return {text:args[0]?"Starting simulated scan for "+args[0]+"\nPORT      STATE   SERVICE\n22/tcp    open    ssh\n80/tcp    open    http\n443/tcp   open    https\n3306/tcp  closed  mysql\n27017/tcp filtered mongodb\n5 fictional ports checked; no host contacted.":"Usage: scan <host>"};
    case "ssh":return {text:args[0]?"Connecting to "+args[0]+"...\nPermission denied (publickey).\n(simulated SSH response; no connection made)":"Usage: ssh user@host"};
    case "man":case "which":case "type":{
      const name=(args[0]||"").toLowerCase();if(!name||!descriptions[name])return {text:"No entry found. Use help to list commands."};
      if(cmd==="man")return {text:name.toUpperCase()+"(1)\n\nNAME\n  "+name+" - "+descriptions[name]+"\n\nNOTE\n  This command runs only in the simulated TealOS shell."};
      if(cmd==="which")return {text:"/usr/bin/"+name};return {text:name+" is a simulated shell command (/usr/bin/"+name+")"};
    }
    case "seq":{
      const nums=args.map(Number);if(!nums.length||nums.some(n=>!Number.isFinite(n)))return {text:"Usage: seq <last> OR seq <first> <last>"};
      const first=nums.length===1?1:nums[0],last=nums.length===1?nums[0]:nums[1];if(Math.abs(last-first)>100)return {text:"seq: limit is 100 numbers"};
      const step=first<=last?1:-1,out=[];for(let n=first;step>0?n<=last:n>=last;n+=step)out.push(n);return {text:out.join("\n")};
    }
    case "rev":return {text:args.join(" ").split("").reverse().join("")};
    case "sort":case "uniq":{
      const path=args.filter(x=>!x.startsWith("-"))[0];if(!path)return {text:"Usage: "+cmd+" <file>"};const result=readLines(s,path);if(result.error)return {text:cmd+": "+result.error};
      const out=cmd==="sort"?result.lines.slice().sort((a,b)=>a.localeCompare(b)):result.lines.filter((line,index,all)=>index===0||line!==all[index-1]);return {text:out.join("\n")};
    }
    case "factor":{
      const number=Number(args[0]);if(!Number.isSafeInteger(number)||number<1||number>1000000000)return {text:"Usage: factor <positive integer up to 1000000000>"};
      let remaining=number;const factors=[];for(let d=2;d*d<=remaining;d++)while(remaining%d===0){factors.push(d);remaining/=d;}if(remaining>1)factors.push(remaining);
      return {text:number+": "+(factors.join(" ")||number)};
    }
    case "cut":{
      const di=args.indexOf("-d"),fi=args.indexOf("-f"),delimiter=di>=0?args[di+1]:"\t",field=fi>=0?Number(args[fi+1]):1;
      const path=args.filter((x,i)=>!["-d","-f"].includes(x)&&i!==di+1&&i!==fi+1).pop();
      if(!path||!Number.isInteger(field)||field<1)return {text:"Usage: cut -d delimiter -f field <file>"};
      const result=readLines(s,path);if(result.error)return {text:"cut: "+result.error};
      return {text:result.lines.map(line=>line.split(delimiter)[field-1]||"").join("\n")};
    }
    default:return {text:"bash: "+cmd+": command not found\nType help to see supported commands."};
  }
}

async function sendTerminal(channel,value){
  const fence=String.fromCharCode(96).repeat(3);
  const clean=String(value||"").replace(/\u0000/g,"").split(fence).join("[code fence]");
  const rows=clean.split("\n"),chunks=[];let current="";
  for(let line of rows){
    while(line.length>1750){if(current){chunks.push(current);current="";}chunks.push(line.slice(0,1750));line=line.slice(1750);}
    const next=current?current+"\n"+line:line;
    if(next.length>1750){chunks.push(current);current=line;}else current=next;
  }
  if(current||!chunks.length)chunks.push(current);
  for(const chunk of chunks)await channel.send({content:fence+"\n"+chunk+"\n"+fence,allowedMentions:{parse:[]}});
}
function sessionKey(message){return message.channel.id+":"+message.author.id;}
client.on("messageCreate",async message=>{
  if(message.author.bot||message.webhookId)return;
  const key=sessionKey(message);
  if(/^!terminal(?:\s|$)/i.test(message.content)){
    if(sessions.has(key)){await sendTerminal(message.channel,"A terminal session is already active.\nType exit to close it.");return;}
    const session=newSession();sessions.set(key,session);
    await sendTerminal(message.channel,"TealOS 1.0 (Discord Simulation)\nKernel 6.8.0-teal\n\nWelcome, "+message.author.username+".\nA virtual filesystem has been initialized for this channel session.\nType help for commands, or exit to close the session.\n\n"+prompt(session));
    return;
  }
  const session=sessions.get(key);if(!session)return;
  const input=message.content.trim();if(!input)return;
  const result=simulate(session,input);
  if(result.close){await sendTerminal(message.channel,result.text);sessions.delete(key);return;}
  await sendTerminal(message.channel,(result.text?result.text+"\n":"")+prompt(session));
});
client.once("ready",()=>{console.log("Teal Terminal online as "+client.user.tag);console.log("Use !terminal in Discord to begin.");});
if(!TOKEN){console.error("Missing DISCORD_TOKEN. Add your token to the .env file.");process.exit(1);}
client.login(TOKEN).catch(error=>{console.error("Discord login failed:",error);process.exit(1);});
