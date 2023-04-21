const __component = function(id){
  if (id === 0) return `<div></div>`
  return(`
    <div class="btn-group __component_button_group" role="group">
      <button
        type="button"
        id="${'__component_' + id + '_pure'}"
        class="btn ${__component.state.links_data[1][__component.state.data[id]] == 1 ? 'btn-primary' : 'btn-light' }"
      >
        Pure
      </button>
      <button
        type="button"
        id="${'__component_' + id + '_not_pure'}"
        class="btn ${__component.state.links_data[1][__component.state.data[id]] == 2 ? 'btn-primary' : 'btn-light' }"
      >
        Not Pure
      </button>
      <button
        type="button"
        id="${'__component_' + id + '_unknown'}"
        class="btn ${(__component.state.links_data[1][__component.state.data[id]] || 0) == 0 ? 'btn-primary' : 'btn-light' }"
      >
        Unknown
      </button>
    </div>
  `)
}


  __component.state = {

    path: ['json_generator', '__component'],
    params : JSON.parse('__params' || {}),
    data: {},
    default_value : -1,
    links: {
      1 : ['json_generator', '__pure_function']
    },
    links_data : {},

    api: {
      test : (id) => console.log('Test api action', id),
      set_func : function(id, func_id){
        __component.state.data[id] = func_id
        __component.state.save()
      }
    },

    containers: function(c_id){
      const items = new Set()
      for (item of document.getElementsByClassName('__component'))
        items.add(item.id)
      return [...items].filter(c => c_id ? c === c_id : true) || []
    },

    init: function(c_ids){
      for( c_id of (c_ids || [])){
        if (!__component.state.data[c_id])
        __component.state.data[c_id] = __component.state.params.id || __component.state.default_value
      }
    },

    action : (id, val) => function(){
      __component.state.links_data[1] = {...__component.state.links_data[1], [__component.state.data[id]] : val};
      __component.state.render(null, id)
      __component.state.save_l()
    },

    events: function(){
      return(
        {
          ['pure'] : {
            event : 'click',
            action : function(id){
              return __component.state.action(id, 1)
            }
          },
          ['not_pure'] : {
            event : 'click',
            action : function(id){
              return __component.state.action(id, 2)
            }
          },
          ['unknown'] : {
            event : 'click',
            action : function(id){
              return __component.state.action(id, 0)
            }
          },
        }
      )
    },

    load_dependeces : function(store){
      if(
          store &&
          !(Object.keys(store).length === 0) &&
          !(Object.keys(__component.state.links).length === 0)
        ){
        Object.entries(__component.state.links).forEach(([key, path]) => {
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
          if(!check){
            __component.state.links_data = {...__component.state.links_data, [key] : data ? JSON.parse(JSON.stringify(data)) : {}}
          } else {
            __component.state.links_data = {...__component.state.links_data, [key] : {}}
          }
        })
      }
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
          let it = document.getElementById('__component' + '_' + c_id + '_' + key)
          if (it){
            it.removeEventListener(ev.event, ev.action(c_id))
            it.addEventListener(ev.event, ev.action(c_id))
          }
        });
      }
    },

    render : function(store = null, c_id = null){
      //console.log('START')
      const containers = __component.state.containers(c_id)
      //console.log('C')
      __component.state.load_dependeces(store)
      //console.log('LD', __component.state.links, __component.state.links_data)
      __component.state.restore(store)
      //console.log('RS')
      __component.state.init(containers)
      //console.log('I')
      __component.state.implace(containers)
      //console.log('IM')
      __component.state.logic(containers)
      //console.log('L')
      //console.log('END')
    },

    save_l : function(){
      for (const key of Object.keys(__component.state.links)) {
        vscode.postMessage({
          command: '__store',
          path: __component.state.links[key],
          data: __component.state.links_data[key]
        })
      }
    },

    save : function(){
      vscode.postMessage({
        command: '__store',
        path: __component.state.path,
        data : __component.state.data
      })
    },

  }

  __component.state.render(JSON.parse('__init_store'))