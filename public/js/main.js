const deleteBtn = document.querySelectorAll('.del')


Array.from(deleteBtn).forEach((el)=>{
    el.addEventListener('click', deletePerson)
})


async function deletePerson(){
    const personId = this.closest('.personPlan').dataset.id
    try{
        const response = await fetch('plan/deletePerson', {
            method: 'delete',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({
                'personIdFromJSFile': personId
            })
        })
        const data = await response.json()
        console.log(data)
        location.reload()
    }catch(err){
        console.log(err)
    }
}
