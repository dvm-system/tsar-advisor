const _pure_function = function(id){
  //console.log('RENDER_DATA',_pure_function.state.data )
  if (_pure_function.state.data.check[id]){
    return( `
      <button class="${_pure_function.state.class + '_' + id + '_button'} btn btn-primary btn-lg active"> P </button>
    `)
  } else {
    return( `
      <button class="${_pure_function.state.class + '_' + id + '_button'} btn btn-secondary btn-lg active"> P </button>
    `)
  }
}


  _pure_function.state = {
    class: 'pure_function',
    path: ['json_generator', 'pure_function'],
    data: {
      check: {}
    },
    render : function(store = null){

      if(store && !(Object.keys(store).length === 0)){
        console.log('STORE-PF',store)
        let data = store
        let check = false
        for (const dir of _pure_function.state.path){
          if (dir in data){
            data = data[dir]
          } else {
            check = true
            break;
          }
        }
        if(!check)
          _pure_function.state.data = data
      }

      if (document.getElementsByClassName(_pure_function.state.class)){

        const ids = new Set()

        for (let item of document.getElementsByClassName(_pure_function.state.class)) {
          if (!( item.id in _pure_function.state.data.check ))
            _pure_function.state.data.check[item.id] = false
          item.innerHTML = _pure_function(item.id)
          ids.add(item.id)
        }

        for( let id of ids){
          for (let btn of document.getElementsByClassName(_pure_function.state.class + '_' + id + '_button')){
              btn.addEventListener('click', _pure_function.state.action(id))
          }
        }

      }
    },
    save : function(){
      vscode.postMessage({
        command: 'store',
        path: _pure_function.state.path,
        data : _pure_function.state.data
      })
    },
    action : (id) => function(){
      _pure_function.state.data.check[id] = !_pure_function.state.data.check[id] ;
      _pure_function.state.render()
      _pure_function.state.save()
    }
  }

  _pure_function.state.render()