import van from "./van-1.5.2.debug.js"

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags



const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))


const searchWord = van.state("")
const searchDefinition = van.state("")
const searchColor = van.state({})
const searchColorNotEmpty = van.derive(()=>Object.entries(searchColor.val).filter(([_,search])=>search).length>0)
const addWord = van.state("")
const addNoteTitle = van.state("")

let dictionary = van.state([
  {color:van.state("loje"),word:van.state("toki"),meaning:van.state("talk/communicate\n(also 'hello' when used as an exclamation)")},
  {color:van.state("loje"),word:van.state("pona"),meaning:van.state("good/simple")},
])

function createNote(text,open){
  const t = van.state(text)
  let note = {
    text:t,
    open:van.state(open??true),
    title: van.derive(()=>t.val.split("\n")[0]),
    urlTitle: van.derive(()=>t.val.match(/^https:\/\//)?true:false)
  }
  return note
}

let notes = van.state([
  createNote(`example`)
])
let deletedNotes = van.state([])

let startData = localStorage.getItem("dictionary")

const jsonDictionary = van.derive(()=>{
  let obj = {
    dictionary: [],
    notes: [],
    version: 1,
  }

  dictionary.val.map(({color,word,meaning})=>{
    obj.dictionary.push({color:color.val,word:word.val,meaning:meaning.val})
  })
  notes.val.map(({text,open})=>{
    obj.notes.push({text:text.val,open:open.val})
  })

  localStorage.setItem("dictionary",JSON.stringify(obj))
  return JSON.stringify(obj)
})
const jsonError = van.state("")

function loadJson(json){
  try{
    if(json=="") return;
    
    let obj = JSON.parse(json)

    let newDictionary;
    if(Array.isArray(obj)){
      //legacy feature. also allows for quickly clearing a save by doing []
      console.log("parsing from array!")
      newDictionary = obj;
    }else{
      console.log("extracting dictionary!")
      newDictionary = obj.dictionary;

      if(obj.notes){
        notes.val = obj.notes.map(note => createNote(note.text,note.open))
      }
    }

    if(newDictionary){
      dictionary.val = newDictionary.map(({color,word,meaning})=>{
        return {color:van.state(color),word:van.state(word),meaning:van.state(meaning)}
      })
    }

    jsonError.val = ""
  }catch(e){
    jsonError.val = e.toString()

  }
}

loadJson(startData)

let deleted = van.state([])

function boundInput(value,placeholder,buttons = [[()=>value.val="","telo"]]){
  return span({class:"voidable-input"},
    input({
      value:value,
      placeholder:placeholder,
      oninput:e=>value.val = e.target.value,
      onkeydown:e=>{
        if(e.key == "Enter"){
          for(let button of buttons){
            if(button[2]) button[0]()
          }
        }
      }
    }),
    ...buttons.map(([action,text])=>{
      return button({onclick:action},text)
    }),
  )
}

const colors = [
  "loje",
  "laso",
  "jelo",
  "walo",
]

function showEntry(entry){
  return (
    searchColorNotEmpty.val && !searchColor.val[entry.color.val]
  ) || (
    entry.meaning.val.indexOf(searchWord.val)===-1 && 
    entry.word.val.indexOf(searchWord.val)===-1
  );
}

const visible = van.derive(()=>dictionary.val.filter(v=>!showEntry(v)).length)

function compAutosizeTextarea(value,attributes={}){
  return div({...attributes,class:"autosize-textarea "+(attributes.class??"")},
    div(value," "),
    textarea({placeholder:attributes.placeholder??"",rows:1,value:value,oninput:e=>value.val=e.target.value})
  )
}

function isLong(word){
  return word.indexOf(" ")!==-1 || word.length>8
}

function compDictEntry(entry){
  let {word,meaning,color} = entry
  return div({
    class:()=>[
      "entry",
      showEntry(entry) && "hidden"
    ].join(" "),
    style:()=>`--c: var(--${color.val})`
  },
    div({class:"word"},word,()=>isLong(word.val)?br():" ",span({class:"sitelen-pona"},word)),
    compAutosizeTextarea(meaning,{class:"definition"}),
    div({class:"buttons"},
      button({style:"--c:var(--loje)",onclick:()=>{
        if(deleted.val.indexOf(entry)!==-1){
          dictionary.val = [...dictionary.val,entry]
          deleted.val = deleted.val.filter(v=>v!==entry)
        }else{
          deleted.val = [entry,...deleted.val]
          dictionary.val = dictionary.val.filter(v=>v!==entry)
        }
      }},()=>deleted.val.indexOf(entry)!==-1?"weka ala":"weka"),
      button({style:"--c:var(--walo)"},":"),
      colors.map(c=>button({style:`--c: var(--${c})`,onclick:()=>color.val = c},c))
    ),
  )
}

function compNote(note){
  return details({class:"qa-segment",open:note.open,ontoggle:e=>{
    note.open.val=e.target.open
  }},
    ()=>summary(
      span(span({class:"sitelen-pona"},()=>note.open.val?"open":"pini")," ",
      ()=>note.open.val?"open":"pini"),()=>a(note.urlTitle.val?{href:note.title.val}:{},note.title),
      button({onclick:()=>{  
        if(deletedNotes.val.indexOf(note)!==-1){
          notes.val = [...notes.val,note]
          deletedNotes.val = deletedNotes.val.filter(v=>v!==note)
        }else{
          deletedNotes.val = [note,...deletedNotes.val]
          notes.val = notes.val.filter(v=>v!==note)
        }
      }},()=>deletedNotes.val.indexOf(note)!==-1?"weka ala":"weka")
    ),
    compAutosizeTextarea(note.text,{placeholder:"toki ala"})
  )
}

function search(){
  return [
    div({class:"inputs"},
      boundInput(searchWord,"toki"),
      //boundInput(searchDefinition,"toki suli"),
    ),
    div({class:"colors"},
      colors.map(c=>button({
        class:()=>searchColor.val[c]?"search-color":"",
        style:`--c: var(--${c})`,
        onclick:e=>searchColor.val = searchColor.val[c] ? e.shiftKey?{...searchColor.val,[c]:undefined}:{} : e.shiftKey?{...searchColor.val,[c]:true}:{[c]:true}
      },c))
    ),
  ]
}

const parser = new DOMParser();

van.add(document.body,()=>div({class:"main"},
  div({class:"column"},
    ...search(),
    ()=>div({class:"dictionary"},
      ...dictionary.val.sort((a,b)=>a.word.val.localeCompare(b.word.val)).map(compDictEntry),
    ),
    div(() => visible.val == dictionary.val.length ? "ale"
    : visible.val == 0 ? "ala"
    : `${visible.val}`),
    boundInput(addWord,"toki",[
      [()=>{
        if(addWord.val == "") return;

        dictionary.val = [
          ...dictionary.val,
          {color:van.state("loje"),word:van.state(addWord.val),meaning:van.state("???")},
        ]
        addWord.val = ""
      },()=>span("pana (",span({class:"sitelen-pona"},()=>addWord.val.length==0?"?":addWord.val),")"),true]
    ]),
    details(
      summary("weka"),
      ()=>div({class:"dictionary"},
        ...deleted.val.map(compDictEntry),
      ),
      ()=>div(
        ...deletedNotes.val.map(compNote),
      ),
    ),
    ()=>details(
      summary("[{},{}]"),
      input({oninput:e=>loadJson(e.target.value),value:jsonDictionary}),
      div(jsonError)
    )
  ),
  div({class:"column"},
    div({class:"keep-on-screen flex-col"},
      details({
        class:"horizontal-fold",
        open:true
      },
        summary("notes"),
        ()=>div({class:'screen-sized'},
          notes.val.sort((a,b)=>a.title.val.localeCompare(b.title.val)).map(q=>compNote(q)),
        ),
        boundInput(addNoteTitle,"nimi",[[async ()=>{
          let newNote = createNote(addNoteTitle.val+"\n")
          if(newNote.urlTitle){
            let html = parser.parseFromString(await (fetch(newNote.title.val).then(r=>r.text())),"text/html")
            console.log(html)
            html.querySelectorAll("ul").forEach(ul=>{
              console.log(ul)
              ul.querySelectorAll("li").forEach(li=>{
                console.log(li)
                newNote.text.val+=li.textContent+"\n= \n"
              })
              newNote.text.val+="\n"
            })
          }
          notes.val = [
            ...notes.val,
            newNote
          ]
          addNoteTitle.val = ""
        },"pali",true]])
      )
    ),
  )
))