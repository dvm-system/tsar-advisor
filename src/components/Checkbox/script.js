const __component = function(id){
  if (id === 0) return `<div></div>`
  if (__component.state.data[id].state){
    return(`
      <div class="form-check __component_container" >
        <input class="form-check-input  __component_input_on" type="checkbox" checked  id="__component_${id}_on">
      </div>
    `)
  } else {
    return (`
      <div class="form-check __component_container">
        <input class="form-check-input __component_input_off" type="checkbox"  id="__component_${id}_off">
      </div>
    `)
  }
}

  __component.state = {
    params : JSON.parse('__params'),
    context: {},
    data: {},
    default_value : {
      state : false
    },

    api: {
      get : (id) => {
        return __component.state.data[id].state
      },
    },

    containers: function(c_id){
      const items = new Set()
      for (item of document.getElementsByClassName('__component'))
        items.add(item.id)
      return [...items].filter(c => c_id ? c === c_id : true) || []
    },

    init: function(c_id, key){
      if (
        key &&
        __component.state.context &&
        __component.state.context[c_id] &&
        __component.state.context[c_id][key]
      ){
        __component.state.data[c_id] = __component.state.context[c_id][key]
      } else {
        __component.state.data[c_id] = {key, ...__component.state.default_value, ...__component.state.params[c_id].data}
      }
    },

    action : (id, key, path, val) => function(){
      __component.state.data[id].state = !__component.state.data[id].state
      __component.state.min_render(id, key, path)
      __component.state.save(id, path)
    },

    events: function(){
      return(
        {
          ['on'] : {
            event : 'click',
            action : function(id, key, path){
              return __component.state.action(id, key, path, null)
            }
          },
          ['off'] : {
            event : 'click',
            action : function(id, key, path){
              return __component.state.action(id, key, path, null)
            }
          },
        }
      )
    },

    set_context: function(c_id, key){
      if (!__component.state.context[c_id])
        __component.state.context[c_id] = {}
      if (!__component.state.context[c_id][key])
        __component.state.context[c_id][key] = {}
      __component.state.context[c_id][key] = __component.state.data[c_id]
    },

    restore : function(store, c_id = null, dynamic_id = null, ){
      if (!__component.state.params) return;
      for (const [id, opt] of Object.entries(__component.state.params)) {
        const path = opt.path
        if(store && path && !(Object.keys(store).length === 0)){
          let data = store
          let check = false
          for (const dir of path){
            if (dir in data){
              data = data[dir]
            } else {
              check = true
              break;
            }
          }
          if(!check)
            __component.state.context[id] = data
        }
      }
      __component.state.render(c_id, dynamic_id)
    },

    implace : function(c_id){
      const item = document.getElementById(c_id)
      if (item)
        item.innerHTML = __component(c_id)
    },

    logic : function(c_id, el_key, path){
      const item = document.getElementById(c_id)
      Object.entries(__component.state.events() || {}).forEach(([key, ev]) => {
        let it = document.getElementById('__component' + '_' + c_id + '_' + key)
        if (it){
          it.removeEventListener(ev.event, ev.action(c_id, el_key, path))
          it.addEventListener(ev.event, ev.action(c_id, el_key, path))
        }
      });
    },

    render : function(c_id = null, dynamic_id = null){
      // console.log('Render', JSON.stringify(
      //   {
      //     'iunput' : {
      //       c_id,
      //       dynamic_id,
      //     },
      //     'params':__component.state.params,
      //     'data': __component.state.data,
      //     'context': __component.state.context,
      //   }
      //   , null, 2)
      // )

      const containers = __component.state.containers(c_id)
      for (const container of containers){
        const path = dynamic_id ? [...__component.state.params[container].path, dynamic_id] : __component.state.params[container].path
        const key = dynamic_id || 'default'
        __component.state.init(container, key)
        __component.state.implace(container)
        __component.state.logic(container,key, path)
      }
    },

    min_render : function(id, key, path){
      // console.log('Min-Render', JSON.stringify(
      //   {
      //     'iunput' : {
      //       id,
      //       key,
      //       path
      //     },
      //     'params':__component.state.params,
      //     'data': __component.state.data,
      //     'context': __component.state.context,
      //   }
      //   , null, 2)
      // )
      __component.state.implace(id)
      __component.state.logic(id, key, path)
      __component.state.set_context(id, key)
    },

    save : function(id, path){
      vscode.postMessage({
        command: '__store',
        path: path,
        data : __component.state.data[id]
      })
    },

  }
