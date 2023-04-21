const __component = function(id){
  return( `
    <button
      type="button"
      id="${id + '_save'}"
      class="btn btn-priamry btn-sm __component_save"
      title="Create Configuration"
      data-toggle="tooltip"
      data-placement="bottom"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down-circle" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"/>
      </svg>
    </button>
  `)
}

  __component.state = {

    path: ['json_generator', '__component'],
    data: {},
    default_value : 0,

    containers: function(c_id){
      const items = new Set()
      for (item of document.getElementsByClassName('__component'))
        items.add(item.id)
      return [...items].filter(c => c_id ? c === c_id : true) || []
    },

    init: function(c_ids){
      for( c_id of (c_ids || [])){
        if (!__component.state.data[c_id])
        __component.state.data[c_id] = __component.state.default_value
      }
    },

    action : (id) => function(){
      __component.state.data[id] = __component.state.data[id] + 1 ;
      __component.state.render(null, id)
      __component.state.save()
    },

    events: function(){
      return(
        {
          ['save'] : {
            event : 'click',
            action : function(id){
              return __component.state.action(id)
            }
          },
        }
      )
    },

    restore : function(store){
      if(store && !(Object.keys(store).length === 0)){
        let data = store
        let check = false
        for (const dir of __component.state.path){
          if (dir in data){
            data = data[dir]
          } else {
            check = true
            break;
          }
        }
        if(!check)
          __component.state.data = data
      }
    },

    implace : function(c_ids){
      for( c_id of (c_ids || [])){
        const item = document.getElementById(c_id)
        if (item)
          item.innerHTML = __component(c_id)
      }
    },

    logic : function(c_ids){
      for( c_id of (c_ids || [])){
        const item = document.getElementById(c_id)
        Object.entries(__component.state.events() || {}).forEach(([key, ev]) => {
          let it = document.getElementById(c_id + '_' + key)
          if (it){
            it.removeEventListener(ev.event, ev.action(c_id))
            it.addEventListener(ev.event, ev.action(c_id))
          }
        });
      }
    },

    render : function(store = null, c_id = null){
      const containers = __component.state.containers(c_id)
      __component.state.restore(store)
      __component.state.init(containers)
      __component.state.implace(containers)
      __component.state.logic(containers)
    },

    save : function(){
      vscode.postMessage({
        command: '__store',
        path: __component.state.path,
        data : __component.state.data
      })
    },

  }

  __component.state.render()