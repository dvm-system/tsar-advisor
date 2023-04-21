const __component = function(id){
  if (__component.state.data[id] == 1){
    return( `
      <button
        id="${id + '_pure'}"
        class="btn btn-outline-dark btn-sm active __component_pure "
        title="Function mark as pure.\nClick to mark function as not-pure.\nDouble click to unmark function."
        data-toggle="tooltip"
        data-placement="bottom"
      >
        P
      </button>
    `)
  }
  if (__component.state.data[id] == 0) {
    return( `
      <button
        id="${id + '_not_pure'}"
        class="btn btn-outline-dark  btn-sm active __component_unmark"
        title="Function unmark.\nClick to mark function as pure.\nDouble click to mark function as not-pure."
         data-toggle="tooltip"
         data-placement="bottom"
      >
        P
      </button>
    `)
  }
  if (__component.state.data[id] == 2) {
    return( `
      <button
        id="${id + '_unknown'}"
        class="btn btn-outline-dark  btn-sm active __component_not_pure"
        title="Function mark as not-pure.\nClick to unmark function.\nDouble click to mark function as pure"
        data-toggle="tooltip"
        data-placement="bottom"
      >
        P
      </button>
    `)
  }
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
      __component.state.data[id] = (__component.state.data[id] + 1) % 3 ;
      __component.state.render(null, id)
      __component.state.save()
    },

    events: function(){
      return(
        {
          ['pure'] : {
            event : 'click',
            action : function(id){
              return __component.state.action(id)
            }
          },
          ['not_pure'] : {
            event : 'click',
            action : function(id){
              return __component.state.action(id)
            }
          },
          ['unknown'] : {
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