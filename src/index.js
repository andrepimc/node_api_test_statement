const express = require("express");
const { json } = require("express/lib/response");
const {v4:uuidv4 } = require("uuid");
const app = express();
app.use(express.json());

const accounts = [];

/**
 * Tipos de parâmetros
 * 
 * Route Params => Identificar um recurso editar/deletar/buscar
 * Query Params => Paginação/ Filtro
 * Body Params => Os objetos inserção/alteração (Noramalmente em JSON)
 */

//Middleware
function accountExists(req, res, next){
    const {cpf}= req.headers; 
    const account = accounts.find((costumer) => costumer.cpf === cpf);
    if(!account){
        return res.status(400).json({error: "Conta não encontrada :("})
    }

    req.account = account; //repassar a conta do Middleware para o method

    return next();
}

function getBalance(statement){
   const balance = statement.reduce((acc, op)=>{
        if(op.type === "credit"){
            return acc + op.amount; // acc = 0 + valor na operação única de crédito
            
        } else {
            return acc - op.amount; // acc = 0 - valor na operação única de débito (vai dar <0) 
        }
    }, 0)
    return balance;
}

app.post('/account', (req, res)=>{
    const {cpf, name} = req.body;
    const accountExist = accounts.some((account)=>account.cpf === cpf); //some pode ser sempre muito útil para verificações

    if(accountExist){
        return res.status(400).json({error: "Esta conta já existe"});
    }

    accounts.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })
    return res.status(201).send()
});

app.get('/statement', accountExists ,(req, res)=>{ //statement = extrato bancário (usar no P.E.)
    const {account}= req;
    return res.json(account.statement);
});

app.post('/deposit', accountExists, (req, res)=>{
    const {description, amount}= req.body;
    const {account} = req;
    const statementOp = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }
    account.statement.push(statementOp); //Passando statementOp para dentro do statement do usuário em questão

    return res.status(201).send();
})

app.post('/withdraw', accountExists, (req, res)=>{
    const {amount}=req.body;
    const {account} =req;

    const balance = getBalance(account.statement);

    if(balance < amount){
        return res.status(400).json({error: "Saldo insuficiente!!!"})
    }

    const statementOp = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    account.statement.push(statementOp);

    return res.status(201).send();

    
})

app.get('/statement/date', accountExists, (req, res)=>{
    const {account} = req;
    const {date} = req.query;
    const dateFormat = new Date(date + " 00:00");
    const statements = account.statement.filter((statement)=>statement.created_at.toDateString() === new Date(dateFormat).toDateString());



    return res.json(statements);

})

app.put("/account", accountExists, (req, res)=>{
    const {account}= req;
    const {name}= req.body;
    account.name = name;

    return res.status(201).send();
})

app.get('/account', accountExists, (req, res)=>{
    const {account}=req;

    return res.json(account);
})

app.delete('/account', accountExists, (req, res)=>{
    const {account}= req;
    accounts.splice(account, 1);

    return res.status(200).json(accounts);
})

app.get('/balance',accountExists, (req,res)=>{
    const {account} = req;
    const balance = getBalance(account.statement);

    return res.json(balance);
})



app.listen(3333);