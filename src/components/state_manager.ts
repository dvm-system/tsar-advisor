export let Store = {}


export const add = ({command, state} : {command : string, state : any}) => {
	Store = {...Store, [command] : state}
}
