let nodes = new vis.DataSet([]); //cria estrutura de nodos
let edges = new vis.DataSet([]); //cria estrutura de ligações

//pega elemento do html com nome condizente e define como container onde o grafo será desenhado
let container = document.getElementById("mynetwork");

let options = { //configura visuais do diagrama
    nodes: { //define aparência do nodo
        shape: "circle",
        font: { size: 20 }
    },
    edges: { //define aparência das setas/ligações
        arrows: "to",
        font: { align: "top" }
    },
    physics: false
};

//cria grafo no site
let network = new vis.Network(container, { nodes, edges }, options);

let nextNodeId = 1; //id automático para adicionar novos estados

function addState(label = null) { //função para adicionar novos estados
    let id = nextNodeId++; //incrementa id do estado para que cada novo estado tenha um id único

    let label = "q" + id;

    //adiciona nodo do novo estado ao DataSet
    nodes.add({
        id: id, //define id do estado
        label: label, //seu nome, que conterá mesmo valor de seu id(automático)
        shape: "circle" //define seu formato(puramento estético)
    });

    return id;
}

function addTransition(fromId, toId, condition) { //função para adicionar transições
    //adiciona transição do nodo estado ao DataSet
    edges.add({
        from: fromId, //qual nodo a linha vai partir
        to: toId, //para qual nodo ela aponta
        label: condition, //condições de transição(puramente visual)
        arrows: "to" //define a aparência da linha como uma seta
    });
}

function criarEstado() { //função que contém o estado que o usuário criou
    let nome = document.getElementById("stateName").value; //define seu nome
    let id = addState(nome); //seu nome é usado para definir seu id
    console.log("Estado criado com ID: " + id); //log para validação
}

function criarTransicao() { //função que conterá as transições definidas pelo usuário
    let from = Number(document.getElementById("fromId").value); //pega valor do elemento que seta vai partir
    let to = Number(document.getElementById("toId").value); //pega valor do elemento que a seta vai apontar
    let cond = document.getElementById("cond").value; //pega valores das condições de transição

    addTransition(from, to, cond); //chama função e passa valores
}