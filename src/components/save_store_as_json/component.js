const _save_store_as_json = function(id){
  if(_save_store_as_json.state.data.disabled){
    return( `
      <button
        type="button"
        id="sort-button"
        class="
          ${_save_store_as_json.state.class + '_' + id + '_button'}
          btn
          btn-priamry
          btn-sm
        "
        title="Create Configuration"
        data-toggle="tooltip"
        data-placement="bottom"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down-circle" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"/>
        </svg>
      </button>
    `)
  } else {
    return(`
      <button
        type="button"
        id="sort-button"
        class="
          ${_save_store_as_json.state.class + '_' + id + '_button'}
          btn
          btn-priamry
          btn-sm
        "
        title="Create Configuration"
        data-toggle="tooltip"
        data-placement="bottom"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-down-circle" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"/>
        </svg>
      </button>
    `)
    // return( `
    //   <button
    //     class="
    //       ${_save_store_as_json.state.class + '_' + id + '_button'}
    //       btn
    //       btn-primary
    //       btn-lg
    //       active"
    //     >
    //       Создать конфигурацию
    //     </button>
    // `)
  }
}

  _save_store_as_json.state = {
    class: 'save_store_as_json',
    path: ['json_generator', 'save_store_as_json'],
    data: {
      disabled : false
    },
    file_name: 'conf.json',
    render : function(store = null, disabled = false){
      if (disabled)
        _save_store_as_json.state.data.disabled = true
      //console.log('render')
      if (document.getElementsByClassName(_save_store_as_json.state.class)){
        const ids = new Set()
        for (let item of document.getElementsByClassName(_save_store_as_json.state.class)) {
          item.innerHTML = _save_store_as_json(item.id)
          ids.add(item.id)
        }
        for( let id of ids){
          for (let btn of document.getElementsByClassName(_save_store_as_json.state.class + '_' + id + '_button')){
              btn.removeEventListener('click', _save_store_as_json.state.action(id))
              btn.addEventListener('click', _save_store_as_json.state.action(id))
          }
        }
      }

    },
    save : function(){

    },
    action : (id) => function(){
      _save_store_as_json.state.render(null, true)
      vscode.postMessage({
        command: 'store_save_as_json'
      })
    }
  }

  _save_store_as_json.state.render()