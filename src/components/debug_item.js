const _debug_item = function(id){
  return( `
    <h1>
      ${id}+${_debug_item.state.data.count[id]}
    </h1>
    <button class="${_debug_item.state.class + '_' + id + '_button'}"> Increase </button>
  `)
}


_debug_item.state = {
  class: 'debug_item',
  path: ['json_generator', 'debug_item'],
  data: {
    count: {}
  },
  render : function(store = null){

    if(store && !(Object.keys(store).length === 0)){
      //console.log('STORE-DBI',store)
      let data = store
      let check = false
      for (const dir of _debug_item.state.path){
        if (dir in data){
          data = data[dir]
        } else {
          check = true;
          break;
        }
      }
      if(!check)
        _debug_item.state.data = data
    }

    if (document.getElementsByClassName(_debug_item.state.class)){

      const ids = new Set()

      for (let item of document.getElementsByClassName(_debug_item.state.class)) {
        if (!( item.id in _debug_item.state.data.count ))
          _debug_item.state.data.count[item.id] = 0
        item.innerHTML = _debug_item(item.id)
        ids.add(item.id)
      }

      for( let id of ids){
        for (let btn of document.getElementsByClassName(_debug_item.state.class + '_' + id + '_button')){
            btn.addEventListener('click', _debug_item.state.increment(id))
        }
      }

    }
  },
  save : function(){
    vscode.postMessage({
      command: 'store',
      path: _debug_item.state.path,
      data : _debug_item.state.data
    })
  },
  increment : (id) => function(){
    _debug_item.state.data.count[id]++;
    _debug_item.state.render()
    _debug_item.state.save()
  }
}

_debug_item.state.render()