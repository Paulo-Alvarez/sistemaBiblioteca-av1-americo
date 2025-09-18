
class Biblioteca {
    constructor() {
        this.itens = []; 
        this.proximoCodigo = 1; 
    }

    gerarCodigo() {
        return this.proximoCodigo++;
    }

    adicionar(item) {
        this.itens.push(item);
    }

    listar() {
        return this.itens;
    }

    atualizar(codigo, dadosAtualizados) {
        for (let item of this.itens) {
            if (item.atualizar(codigo, dadosAtualizados)) return true;
        }
        return false;
    }

    deletar(codigo) {
        for (let item of this.itens) {
            if (item instanceof Livro && item.deletar(codigo)) {
                const index = this.itens.indexOf(item);
                this.itens.splice(index, 1);
                return true;
            }
            if (item instanceof ColecaoLivros && item.deletar(codigo)) {
                return true;
            }
        }
        return false;
    }
}

class LivroFactory {
    static criarLivro(titulo, autor, ano, categoria, biblioteca) {
        const codigo = biblioteca.gerarCodigo();
        return new Livro(codigo, titulo, autor, ano, categoria);
    }
}

class ItemBiblioteca {
    adicionar(item) { throw "Não implementado"; }
    listar() { throw "Não implementado"; }
    atualizar(codigo, dados) { throw "Não implementado"; }
    deletar(codigo) { throw "Não implementado"; }
}

class Livro extends ItemBiblioteca {
    constructor(codigo, titulo, autor, ano, categoria) {
        super();
        this.codigo = codigo;
        this.titulo = titulo;
        this.autor = autor;
        this.ano = ano;
        this.categoria = categoria;
    }

    listar() { return [this]; }

    atualizar(codigo, dados) {
        if (this.codigo === codigo) {
            Object.assign(this, dados);
            return true;
        }
        return false;
    }

    deletar(codigo) {
        return this.codigo === codigo;
    }
}

class ColecaoLivros extends ItemBiblioteca {
    constructor(nome) {
        super();
        this.nome = nome;
        this.itens = [];
    }

    adicionar(item) {
        this.itens.push(item);
    }

    listar() {
        return this.itens;
    }

    atualizar(codigo, dados) {
        for (let item of this.itens) {
            if (item.atualizar(codigo, dados)) return true;
        }
        return false;
    }

    deletar(codigo) {
        const index = this.itens.findIndex(item => item.deletar(codigo));
        if (index !== -1) {
            this.itens.splice(index, 1);
            return true;
        }
        return false;
    }
}

class Validador {
    setProximo(proximo) {
        this.proximo = proximo;
        return proximo;
    }

    validar(livro) {
        if (this.proximo) return this.proximo.validar(livro);
        return true;
    }
}

class ValidadorTitulo extends Validador {
    validar(livro) {
        if (!livro.titulo || livro.titulo.trim() === "") {
            mostrarMensagem("Título inválido!");
            return false;
        }
        return super.validar(livro);
    }
}

class ValidadorAno extends Validador {
    validar(livro) {
        const anoAtual = new Date().getFullYear();
        if (!livro.ano || livro.ano > anoAtual) {
            mostrarMensagem("Ano inválido! Não é possível cadastrar livros do futuro.");
            return false;
        }
        return super.validar(livro);
    }
}

class ValidadorCategoria extends Validador {
    constructor(categoriasValidas) {
        super();
        this.categoriasValidas = categoriasValidas;
    }

    validar(livro) {
        if (!this.categoriasValidas.includes(livro.categoria)) {
            mostrarMensagem("Categoria inválida! Use: " + this.categoriasValidas.join(", "));
            return false;
        }
        return super.validar(livro);
    }
}

class LivroController {
    constructor() {
        this.biblioteca = new Biblioteca();
        this.categoriasValidas = ["Fantasia", "Romance", "Distopia", "Ciência", "História", "Tecnologia"];
        this.validador = new ValidadorTitulo();
        this.validador
            .setProximo(new ValidadorAno())
            .setProximo(new ValidadorCategoria(this.categoriasValidas));

        this.colecoes = [];
        this.semColecao = null;

        this.carregarLocalStorage();
    }

    salvarLocalStorage() {
        const dados = this.colecoes.map(c => ({
            nome: c.nome,
            itens: c.listar().map(l => ({
                codigo: l.codigo,
                titulo: l.titulo,
                autor: l.autor,
                ano: l.ano,
                categoria: l.categoria
            }))
        }));
        localStorage.setItem("biblioteca", JSON.stringify(dados));
    }

    carregarLocalStorage() {
        const dadosSalvos = JSON.parse(localStorage.getItem("biblioteca") || "[]");

        this.colecoes = [];
        this.biblioteca = new Biblioteca();

        for (const dadosColecao of dadosSalvos) {
            const colecao = new ColecaoLivros(dadosColecao.nome);
            this.biblioteca.adicionar(colecao);
            this.colecoes.push(colecao);

            for (const dadosLivro of dadosColecao.itens) {
                const livro = new Livro(
                    dadosLivro.codigo,
                    dadosLivro.titulo,
                    dadosLivro.autor,
                    dadosLivro.ano,
                    dadosLivro.categoria
                );
                colecao.adicionar(livro);
            }
        }

        const semColecaoExistente = this.colecoes.find(c => c.nome === "Sem Coleção");
        if (!semColecaoExistente) {
            this.semColecao = this.criarColecao("Sem Coleção");
        } else {
            this.semColecao = semColecaoExistente;
        }

        const todosLivros = this.colecoes.flatMap(c => c.listar());
        const maxCodigo = todosLivros.length > 0 ? Math.max(...todosLivros.map(l => l.codigo)) : 0;
        this.biblioteca.proximoCodigo = maxCodigo + 1;
    }

    criarLivro(titulo, autor, ano, categoria, nomeColecao = "") {
        const existe = this.colecoes.some(c => c.listar().some(l => l.titulo === titulo));
        if (existe) {
            mostrarMensagem(`Já existe um livro com o título "${titulo}"!`);
            return;
        }

        const livro = LivroFactory.criarLivro(titulo, autor, ano, categoria, this.biblioteca);

        if (!this.validador.validar(livro)) return;

        let colecao = nomeColecao ?
            this.colecoes.find(c => c.nome === nomeColecao) :
            this.semColecao;

        if (!colecao && nomeColecao) {
            colecao = this.criarColecao(nomeColecao);
        }

        colecao.adicionar(livro);

        mostrarMensagem(`Livro "${livro.titulo}" adicionado em "${colecao.nome}"`, "green");
        
        this.salvarLocalStorage();
        listarLivros();
    }

    criarColecao(nome) {
        const colecao = new ColecaoLivros(nome);
        this.biblioteca.adicionar(colecao);
        this.colecoes.push(colecao);
        this.salvarLocalStorage();
        return colecao;
    }

    listarLivros() {
        return this.colecoes;
    }

    atualizarLivro(codigo, dadosAtualizados) {
        for (let c of this.colecoes) {
            if (c.atualizar(codigo, dadosAtualizados)) {
                mostrarMensagem("Livro atualizado!", "green");
                this.salvarLocalStorage();
                listarLivros();
                return;
            }
        }
        mostrarMensagem("Livro não encontrado!");
    }

    deletarLivro(codigo) {
        for (let c of this.colecoes) {
            if (c.deletar(codigo)) {
                mostrarMensagem("Livro deletado!", "green");
                this.salvarLocalStorage();
                listarLivros();
                return;
            }
        }
        mostrarMensagem("Livro não encontrado!");
    }
}