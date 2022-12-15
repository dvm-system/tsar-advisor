// 3 state
// pure = 0
// not_pure = 1
// unknown = 2

const _pure_function = function(id){
  if (_pure_function.state.data.check[id] == 1){
    return( `
      <button
        class="${_pure_function.state.class + '_' + id + '_button'}  btn btn-outline-dark btn-sm active pure_func_button_mark_pure"
        title="Function mark as pure.\nClick to mark function as not-pure.\nDouble click to unmark function." data-toggle="tooltip" data-placement="bottom"
      >
        P
      </button>
    `)
  }
  if (_pure_function.state.data.check[id] == 0) {
    return( `
      <button
        class="${_pure_function.state.class + '_' + id + '_button'} btn btn-outline-dark  btn-sm active pure_func_button_unmark"
        title="Function unmark.\nClick to mark function as pure.\nDouble click to mark function as not-pure." data-toggle="tooltip" data-placement="bottom"
      >
        P
      </button>
    `)
  }
  if (_pure_function.state.data.check[id] == 2) {
    return( `
      <button
        class="${_pure_function.state.class + '_' + id + '_button'} btn btn-outline-dark  btn-sm active pure_func_button_mark_not_pure"
        title="Function mark as not-pure.\nClick to unmark function.\nDouble click to mark function as pure" data-toggle="tooltip" data-placement="bottom"
      >
        P
      </button>
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

      console.log('RENDER_PURE_FUNCTION_COMPONENT:::', store )

      if(store && !(Object.keys(store).length === 0)){
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
            _pure_function.state.data.check[item.id] = 0
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
      _pure_function.state.data.check[id] = (_pure_function.state.data.check[id] + 1) % 3 ;
      _pure_function.state.render()
      _pure_function.state.save()
    }
  }

  _pure_function.state.render()