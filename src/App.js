import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5501/api';
const STORAGE_KEY = 'video-production-data';

export default function App() {
  const [view, setView] = useState('gantt');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [phases, setPhases] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  useEffect(() => { 
    loadData(); 
  }, []);

  useEffect(() => {
    if (useLocalStorage) {
      saveToStorage();
    }
  }, [projects, tasks, phases, teamMembers, useLocalStorage]);

  const saveToStorage = () => {
    try {
      const data = { projects, tasks, phases, teamMembers, selectedProject };
      window.storage.set(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log('Storage not available, data will not persist');
    }
  };

  const loadFromStorage = async () => {
    try {
      const result = await window.storage.get(STORAGE_KEY);
      if (result && result.value) {
        const data = JSON.parse(result.value);
        setProjects(data.projects || []);
        setTasks(data.tasks || []);
        setPhases(data.phases || []);
        setTeamMembers(data.teamMembers || []);
        if (data.selectedProject) setSelectedProject(data.selectedProject);
        return true;
      }
    } catch (error) {
      console.log('Could not load from storage');
    }
    return false;
  };

  const loadData = async () => {
    // Try storage first
    const loaded = await loadFromStorage();
    if (loaded) {
      setUseLocalStorage(true);
      setLoading(false);
      return;
    }

    // Try API
    try {
      const [p, t, ph, m] = await Promise.all([
        fetch(`${API_URL}/projects`).then(r => r.json()),
        fetch(`${API_URL}/tasks`).then(r => r.json()),
        fetch(`${API_URL}/phases`).then(r => r.json()),
        fetch(`${API_URL}/team-members`).then(r => r.json())
      ]);
      setProjects(p);
      setTasks(t);
      setPhases(ph);
      setTeamMembers(m);
      if (p.length > 0 && !selectedProject) setSelectedProject(p[0].id);
      setLoading(false);
    } catch (error) {
      // Load demo data
      loadDemoData();
      setUseLocalStorage(true);
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    const demoProjects = [{ id: 1, name: 'Sample Video Project' }];
    const demoPhases = [
      { id: 1, name: 'PRE-PRODUCTION', order: 1 },
      { id: 2, name: 'PRODUCTION', order: 2 },
      { id: 3, name: 'POST-PRODUCTION', order: 3 }
    ];
    const demoMembers = [
      { id: 1, name: 'Sangita Edutainment', avatar_color: '#5b4beb' }
    ];
    const demoTasks = [
      { id: 1, task_code: '234567', name: 'wertgyhj', phase_id: 1, phase_name: 'PRE-PRODUCTION', status: 'Open', owner_id: 1, owner_name: 'Sangita Edutainment', avatar_color: '#5b4beb', start_date: '2026-01-06', end_date: '2026-01-11', duration: 5, project_id: 1 },
      { id: 2, task_code: 'VP-T1', name: 'Client Inputs', phase_id: 1, phase_name: 'PRE-PRODUCTION', status: 'Done', owner_id: 1, owner_name: 'Sangita Edutainment', avatar_color: '#5b4beb', start_date: '2026-01-08', end_date: '2026-01-14', duration: 5, project_id: 1 }
    ];
    setProjects(demoProjects);
    setPhases(demoPhases);
    setTeamMembers(demoMembers);
    setTasks(demoTasks);
    setSelectedProject(1);
  };

  const saveTask = async (data) => {
    const taskData = {
      ...data,
      phase_name: phases.find(p => p.id === data.phase_id)?.name,
      owner_name: teamMembers.find(m => m.id === data.owner_id)?.name,
      avatar_color: teamMembers.find(m => m.id === data.owner_id)?.avatar_color
    };

    if (useLocalStorage) {
      if (editTask) {
        setTasks(tasks.map(t => t.id === editTask.id ? { ...taskData, id: editTask.id } : t));
        showPopup('✅ Task Updated Successfully!');
      } else {
        const newTask = { ...taskData, id: Date.now() };
        setTasks([...tasks, newTask]);
        showPopup('✅ Task Added Successfully!');
      }
      setShowTaskModal(false);
      setEditTask(null);
      return;
    }

    try {
      const url = editTask ? `${API_URL}/tasks/${editTask.id}` : `${API_URL}/tasks`;
      const res = await fetch(url, {
        method: editTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        showPopup(editTask ? '✅ Task Updated Successfully!' : '✅ Task Added Successfully!');
        setShowTaskModal(false);
        setEditTask(null);
        await loadData();
      } else {
        showPopup('❌ Failed to save task');
      }
    } catch (error) {
      showPopup('❌ Error: ' + error.message);
    }
  };

  const deleteTask = async (id) => {
    if (useLocalStorage) {
      setTasks(tasks.filter(t => t.id !== id));
      showPopup('✅ Task Deleted Successfully!');
      setShowTaskModal(false);
      setEditTask(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showPopup('✅ Task Deleted Successfully!');
        setShowTaskModal(false);
        setEditTask(null);
        await loadData();
      } else {
        showPopup('❌ Failed to delete');
      }
    } catch (error) {
      showPopup('❌ Error: ' + error.message);
    }
  };

  const showPopup = (message) => {
    const popup = document.createElement('div');
    popup.textContent = message;
    popup.style.cssText = 'position:fixed;top:20px;right:20px;background:#323232;color:white;padding:16px 24px;borderRadius:4px;zIndex:10000;fontSize:14px;boxShadow:0 4px 12px rgba(0,0,0,0.3);animation:slideIn 0.3s ease;';
    document.body.appendChild(popup);
    setTimeout(() => {
      popup.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => popup.remove(), 300);
    }, 3000);
  };

  const filtered = selectedProject ? tasks.filter(t => t.project_id === selectedProject) : tasks;
  
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'20px',background:'#f5f5f5'}}>
      ⏳ Loading...
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
      `}</style>
      <div style={{fontFamily:'Arial,sans-serif',background:'#f5f5f5',minHeight:'100vh'}}>
        <div style={{background:'white',borderBottom:'1px solid #ddd',padding:'20px',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
            <h1 style={{margin:0,fontSize:'24px',fontWeight:500}}>Video Production Projects</h1>
            <button onClick={()=>{setEditTask(null);setShowTaskModal(true);}} style={{background:'#4285f4',color:'white',border:'none',padding:'10px 20px',borderRadius:'4px',cursor:'pointer',fontWeight:500,fontSize:'14px',boxShadow:'0 2px 4px rgba(66,133,244,0.3)',transition:'background 0.2s'}} onMouseOver={(e)=>e.target.style.background='#3367d6'} onMouseOut={(e)=>e.target.style.background='#4285f4'}>+ Add Task</button>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <select value={selectedProject||''} onChange={(e)=>setSelectedProject(Number(e.target.value))} style={{padding:'8px 12px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'14px',background:'white',cursor:'pointer',minWidth:'200px'}}>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{display:'flex',gap:'0',background:'#f0f0f0',padding:'4px',borderRadius:'4px'}}>
              <button onClick={()=>setView('gantt')} style={{padding:'8px 16px',border:'none',background:view==='gantt'?'white':'transparent',borderRadius:'4px',cursor:'pointer',fontSize:'14px',fontWeight:view==='gantt'?500:400,transition:'all 0.2s',boxShadow:view==='gantt'?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>Gantt</button>
              <button onClick={()=>setView('kanban')} style={{padding:'8px 16px',border:'none',background:view==='kanban'?'white':'transparent',borderRadius:'4px',cursor:'pointer',fontSize:'14px',fontWeight:view==='kanban'?500:400,transition:'all 0.2s',boxShadow:view==='kanban'?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>Kanban</button>
              <button onClick={()=>setView('list')} style={{padding:'8px 16px',border:'none',background:view==='list'?'white':'transparent',borderRadius:'4px',cursor:'pointer',fontSize:'14px',fontWeight:view==='list'?500:400,transition:'all 0.2s',boxShadow:view==='list'?'0 1px 3px rgba(0,0,0,0.1)':'none'}}>List</button>
            </div>
          </div>
        </div>
        <div style={{padding:'20px'}}>
          {view==='gantt'&&<GanttView tasks={filtered} phases={phases} onClick={(t)=>{setEditTask(t);setShowTaskModal(true);}} onAdd={()=>{setEditTask(null);setShowTaskModal(true);}}/>}
          {view==='kanban'&&<KanbanView tasks={filtered} onClick={(t)=>{setEditTask(t);setShowTaskModal(true);}}/>}
          {view==='list'&&<ListView tasks={filtered} phases={phases} onEdit={(t)=>{setEditTask(t);setShowTaskModal(true);}} onDelete={deleteTask}/>}
        </div>
        {showTaskModal&&<TaskModal task={editTask} phases={phases} members={teamMembers} projectId={selectedProject} onClose={()=>{setShowTaskModal(false);setEditTask(null);}} onSave={saveTask} onDelete={editTask?()=>deleteTask(editTask.id):null}/>}
      </div>
    </>
  );
}

function GanttView({tasks,phases,onClick,onAdd}){
  const grouped=phases.reduce((a,p)=>{a[p.name]=tasks.filter(t=>t.phase_id===p.id);return a;},{});
  const getPos=(s,e)=>{const st=new Date(s),en=new Date(e),ps=new Date('2026-01-08');const sd=Math.floor((st-ps)/86400000),du=Math.floor((en-st)/86400000)+1;return{left:`${Math.max(0,(sd/7)*14.28)}%`,width:`${(du/7)*14.28}%`};};
  const getSt=(s)=>({'Done':{bg:'#4285f4',c:'#fff'},'In Progress':{bg:'#fbbc04',c:'#333'},'Testing':{bg:'#34a853',c:'#fff'},'Open':{bg:'#9e9e9e',c:'#fff'}}[s]||{bg:'#9e9e9e',c:'#fff'});
  
  if(!tasks || tasks.length===0){
    return(
      <div style={{background:'white',borderRadius:'8px',padding:'60px 40px',textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <p style={{fontSize:'18px',color:'#999',marginBottom:'20px'}}>📭 No tasks found</p>
        <button onClick={onAdd} style={{background:'#4285f4',color:'white',border:'none',padding:'12px 24px',borderRadius:'4px',cursor:'pointer',fontWeight:500,fontSize:'14px'}}>+ Add Your First Task</button>
      </div>
    );
  }
  
  return(
    <div style={{background:'white',borderRadius:'8px',overflowX:'auto',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
      <div style={{minWidth:'1400px'}}>
        <div style={{display:'flex',borderBottom:'2px solid #e0e0e0',background:'#f8f9fa'}}>
          <div style={{width:'200px',padding:'14px 16px',fontWeight:600,borderRight:'1px solid #ddd',fontSize:'13px',color:'#5f6368'}}>Task Name</div>
          <div style={{flex:1,display:'flex'}}>
            {['W3 18-24 JAN','W4 25-31 JAN','W5 01-07 FEB','W6 08-14 FEB','W7 15-21 FEB','W8 22-28 FEB','W9 01-07 MAR'].map((w,i)=><div key={i} style={{flex:1,minWidth:'170px',textAlign:'center',padding:'14px 8px',fontSize:'12px',fontWeight:500,color:'#5f6368',borderRight:i<6?'1px solid #e0e0e0':'none'}}>{w}</div>)}
          </div>
        </div>
        {Object.entries(grouped).map(([ph,pts])=>(
          <div key={ph}>
            <div style={{background:'#f5f5f5',padding:'10px 16px',fontWeight:600,fontSize:'13px',color:'#202124',borderBottom:'1px solid #e0e0e0'}}>▼ {ph}</div>
            {pts.map(t=>{const p=getPos(t.start_date,t.end_date);const st=getSt(t.status);return(
              <div key={t.id} style={{display:'flex',borderBottom:'1px solid #f0f0f0',minHeight:'52px',alignItems:'center',transition:'background 0.2s'}} onMouseOver={(e)=>e.currentTarget.style.background='#f8f9fa'} onMouseOut={(e)=>e.currentTarget.style.background='white'}>
                <div style={{width:'200px',padding:'12px 16px',borderRight:'1px solid #e0e0e0'}}>
                  <div style={{fontSize:'12px',fontWeight:600,color:'#202124',marginBottom:'2px'}}>{t.task_code}</div>
                  <div style={{fontSize:'11px',color:'#5f6368'}}>{t.name}</div>
                </div>
                <div style={{flex:1,position:'relative',height:'52px',padding:'0 8px'}}>
                  <div onClick={()=>onClick(t)} style={{position:'absolute',top:'12px',height:'28px',borderRadius:'4px',padding:'0 12px',display:'flex',alignItems:'center',fontSize:'11px',cursor:'pointer',left:p.left,width:p.width,background:st.bg,color:st.c,boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'transform 0.2s,box-shadow 0.2s',fontWeight:500}} onMouseOver={(e)=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)';}} onMouseOut={(e)=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 1px 3px rgba(0,0,0,0.2)';}}>{t.name}</div>
                </div>
              </div>
            );})}
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanView({tasks,onClick}){
  const sts=[{n:'Open',c:'#e8f5e9'},{n:'In Progress',c:'#e3f2fd'},{n:'Testing',c:'#fff9c4'},{n:'Done',c:'#f3e5f5'}];
  
  if(!tasks || tasks.length===0){
    return(
      <div style={{background:'white',borderRadius:'8px',padding:'60px 40px',textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <p style={{fontSize:'18px',color:'#999'}}>📭 No tasks found. Add a task to get started!</p>
      </div>
    );
  }
  
  return(
    <div style={{display:'flex',gap:'16px',overflowX:'auto',paddingBottom:'10px'}}>
      {sts.map(st=>{const fts=tasks.filter(t=>t.status===st.n);return(
        <div key={st.n} style={{flex:1,minWidth:'300px',background:'white',borderRadius:'8px',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
          <div style={{padding:'16px',fontWeight:600,fontSize:'14px',borderRadius:'8px 8px 0 0',background:st.c,color:'#202124'}}>{st.n} <span style={{color:'#5f6368',fontWeight:400}}>({fts.length})</span></div>
          <div style={{padding:'16px',minHeight:'500px',maxHeight:'calc(100vh - 250px)',overflowY:'auto'}}>
            {fts.map(t=>(
              <div key={t.id} onClick={()=>onClick(t)} style={{background:'#fafafa',border:'1px solid #e0e0e0',borderRadius:'8px',padding:'14px',marginBottom:'12px',cursor:'pointer',transition:'all 0.2s'}} onMouseOver={(e)=>{e.currentTarget.style.background='white';e.currentTarget.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';e.currentTarget.style.transform='translateY(-2px)';}} onMouseOut={(e)=>{e.currentTarget.style.background='#fafafa';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
                <div style={{fontSize:'11px',fontWeight:600,marginBottom:'6px',color:'#5f6368'}}>{t.task_code}</div>
                <div style={{fontSize:'14px',marginBottom:'8px',fontWeight:500,color:'#202124'}}>{t.name}</div>
                <div style={{fontSize:'12px',color:'#5f6368',marginBottom:'14px',padding:'4px 8px',background:'#f0f0f0',borderRadius:'4px',display:'inline-block'}}>{t.phase_name}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #e0e0e0'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:t.avatar_color||'#5b4beb',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:600}}>{(t.owner_name||'S').charAt(0).toUpperCase()}</div>
                  <span style={{fontSize:'12px',color:'#5f6368'}}>{new Date(t.end_date).toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'})}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );})}
    </div>
  );
}

function ListView({tasks,phases,onEdit,onDelete}){
  const grouped=phases.reduce((a,p)=>{a[p.name]=tasks.filter(t=>t.phase_id===p.id);return a;},{});
  const getBd=(s)=>({'Done':{bg:'#e8f5e9',c:'#2e7d32'},'In Progress':{bg:'#e3f2fd',c:'#1565c0'},'Testing':{bg:'#fff9c4',c:'#f57f17'},'Open':{bg:'#f5f5f5',c:'#616161'}}[s]||{bg:'#f5f5f5',c:'#616161'});
  
  if(!tasks || tasks.length===0){
    return(
      <div style={{background:'white',borderRadius:'8px',padding:'60px 40px',textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
        <p style={{fontSize:'18px',color:'#999'}}>📭 No tasks found. Add a task to get started!</p>
      </div>
    );
  }
  
  return(
    <div style={{background:'white',borderRadius:'8px',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead style={{background:'#f8f9fa',borderBottom:'2px solid #e0e0e0'}}>
          <tr>
            {['ID','NAME','OWNER','STATUS','START','DUE','DURATION','ACTIONS'].map(h=><th key={h} style={{textAlign:'left',padding:'14px 16px',fontSize:'11px',fontWeight:600,color:'#5f6368',letterSpacing:'0.5px'}}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([ph,pts])=>(
            <React.Fragment key={ph}>
              <tr style={{background:'#f5f5f5'}}>
                <td colSpan="8" style={{padding:'12px 16px',fontWeight:600,fontSize:'13px',color:'#202124'}}>▼ {ph}</td>
              </tr>
              {pts.map(t=>{const bd=getBd(t.status);return(
                <tr key={t.id} style={{borderBottom:'1px solid #f0f0f0',transition:'background 0.2s'}} onMouseOver={(e)=>e.currentTarget.style.background='#f8f9fa'} onMouseOut={(e)=>e.currentTarget.style.background='white'}>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:'#202124',fontWeight:500}}>{t.task_code}</td>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:'#202124'}}>{t.name}</td>
                  <td style={{padding:'14px 16px',fontSize:'13px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'32px',height:'32px',borderRadius:'50%',background:t.avatar_color||'#5b4beb',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:600,flexShrink:0}}>{(t.owner_name||'S').charAt(0).toUpperCase()}</div>
                      <span style={{color:'#202124'}}>{t.owner_name}</span>
                    </div>
                  </td>
                  <td style={{padding:'14px 16px'}}><span style={{padding:'6px 14px',borderRadius:'16px',fontSize:'12px',fontWeight:500,background:bd.bg,color:bd.c,display:'inline-block'}}>{t.status}</span></td>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:'#5f6368'}}>{new Date(t.start_date).toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'})}</td>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:'#5f6368'}}>{new Date(t.end_date).toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'})}</td>
                  <td style={{padding:'14px 16px',fontSize:'13px',color:'#5f6368'}}>{t.duration}d</td>
                  <td style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',gap:'8px'}}>
                      <button onClick={()=>onEdit(t)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'4px',transition:'transform 0.2s'}} onMouseOver={(e)=>e.target.style.transform='scale(1.2)'} onMouseOut={(e)=>e.target.style.transform='scale(1)'} title="Edit">✏️</button>
                      <button onClick={()=>{if(window.confirm('⚠️ Are you sure you want to delete this task?'))onDelete(t.id);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'4px',transition:'transform 0.2s'}} onMouseOver={(e)=>e.target.style.transform='scale(1.2)'} onMouseOut={(e)=>e.target.style.transform='scale(1)'} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              );})}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskModal({task,phases,members,projectId,onClose,onSave,onDelete}){
  const [d,setD]=useState({
    task_code:task?.task_code||'',
    name:task?.name||'',
    phase_id:task?.phase_id||(phases[0]?.id||''),
    status:task?.status||'Open',
    owner_id:task?.owner_id||(members[0]?.id||''),
    start_date:task?.start_date||new Date().toISOString().split('T')[0],
    end_date:task?.end_date||new Date(Date.now()+5*86400000).toISOString().split('T')[0],
    duration:task?.duration||5,
    project_id:task?.project_id||projectId
  });
  
  const save=()=>{
    if(!d.task_code||!d.name){
      alert('⚠️ Please fill in all required fields (Task ID and Task Name)');
      return;
    }
    onSave(d);
  };
  
  return(
    <div onClick={(e)=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)'}}>
      <div style={{background:'white',borderRadius:'8px',width:'90%',maxWidth:'550px',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 38px rgba(0,0,0,0.14), 0 9px 46px rgba(0,0,0,0.12), 0 11px 15px rgba(0,0,0,0.2)',animation:'modalSlideIn 0.3s ease'}}>
        <style>{`@keyframes modalSlideIn { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #e0e0e0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{margin:0,fontSize:'20px',fontWeight:500,color:'#202124'}}>{task?'Edit Task':'Add Task'}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'28px',cursor:'pointer',color:'#5f6368',lineHeight:'1',padding:'0',width:'32px',height:'32px'}} title="Close">&times;</button>
        </div>
        <div style={{padding:'24px'}}>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>Task ID *</label>
            <input type="text" value={d.task_code} onChange={(e)=>setD({...d,task_code:e.target.value})} disabled={!!task} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124',background:task?'#f5f5f5':'white'}} placeholder="e.g., VP-T1"/>
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>Task Name *</label>
            <input type="text" value={d.name} onChange={(e)=>setD({...d,name:e.target.value})} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124'}} placeholder="Enter task name"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div>
              <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>Phase</label>
              <select value={d.phase_id} onChange={(e)=>setD({...d,phase_id:Number(e.target.value)})} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124',background:'white',cursor:'pointer'}}>
                {phases.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>Status</label>
              <select value={d.status} onChange={(e)=>setD({...d,status:e.target.value})} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124',background:'white',cursor:'pointer'}}>
                <option>Open</option>
                <option>In Progress</option>
                <option>Testing</option>
                <option>Done</option>
              </select>
            </div>
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>Owner</label>
            <select value={d.owner_id} onChange={(e)=>setD({...d,owner_id:Number(e.target.value)})} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124',background:'white',cursor:'pointer'}}>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div>
              <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>Start Date</label>
              <input type="date" value={d.start_date} onChange={(e)=>setD({...d,start_date:e.target.value})} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124'}}/>
            </div>
            <div>
              <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>End Date</label>
              <input type="date" value={d.end_date} onChange={(e)=>setD({...d,end_date:e.target.value})} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124'}}/>
            </div>
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',marginBottom:'8px',fontSize:'14px',fontWeight:500,color:'#202124'}}>Duration (days)</label>
            <input type="number" value={d.duration} onChange={(e)=>setD({...d,duration:Number(e.target.value)})} style={{width:'100%',padding:'10px 12px',border:'1px solid #dadce0',borderRadius:'4px',boxSizing:'border-box',fontSize:'14px',color:'#202124'}} min="1"/>
          </div>
        </div>
        <div style={{padding:'16px 24px',borderTop:'1px solid #e0e0e0',display:'flex',justifyContent:'space-between',background:'#fafafa'}}>
          <div>
            {task&&onDelete&&<button onClick={()=>{if(window.confirm('⚠️ Are you sure you want to delete this task?'))onDelete();}} style={{padding:'10px 20px',border:'none',background:'#dc3545',color:'white',borderRadius:'4px',cursor:'pointer',fontSize:'14px',fontWeight:500,transition:'background 0.2s'}} onMouseOver={(e)=>e.target.style.background='#c82333'} onMouseOut={(e)=>e.target.style.background='#dc3545'}>Delete</button>}
          </div>
          <div style={{display:'flex',gap:'12px'}}>
            <button onClick={onClose} style={{padding:'10px 20px',border:'1px solid #dadce0',background:'white',borderRadius:'4px',cursor:'pointer',fontSize:'14px',color:'#5f6368',fontWeight:500,transition:'background 0.2s'}} onMouseOver={(e)=>e.target.style.background='#f8f9fa'} onMouseOut={(e)=>e.target.style.background='white'}>Cancel</button>
            <button onClick={save} style={{padding:'10px 20px',border:'none',background:'#4285f4',color:'white',borderRadius:'4px',cursor:'pointer',fontSize:'14px',fontWeight:500,transition:'background 0.2s'}} onMouseOver={(e)=>e.target.style.background='#3367d6'} onMouseOut={(e)=>e.target.style.background='#4285f4'}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

