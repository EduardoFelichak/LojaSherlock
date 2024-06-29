import { produtos } from './utils/produtosObj.js';

document.addEventListener('DOMContentLoaded', () => {
    const db = new PouchDB('cart');
    const row = document.getElementById('products-row');
    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    const cartButton = document.getElementById('cartButton');
    const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));  

    produtos.forEach(produto => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        const card = document.createElement('div');
        card.className = 'card bg-black text-white shadow';
        card.innerHTML = `
            <img src="${produto.img}" class="card-img-top" alt="${produto.nome}">
            <div class="card-body">
                <h5 class="card-title text-center">${produto.nome}</h5>
                <p class="card-text text-center fs-3">${produto.valor}</p>
                <div class="d-grid gap-2">
                    <button class="btn btn-success add-to-cart-btn" data-id="${produto.id}">
                        <i class="bi bi-cart-plus-fill"></i>
                    </button>
                    <button class="btn btn-light btn-lg" data-bs-toggle="modal" data-bs-target="#productModal" data-id="${produto.id}">
                        <i class="bi bi-search"></i>
                    </button>
                </div>
            </div>
        `;
        col.appendChild(card);
        row.appendChild(col);
    });

    row.addEventListener('click', function(event) {
        const btnDetails = event.target.closest('.btn-light');
        if (btnDetails && btnDetails.hasAttribute('data-id')) {
            const productId = btnDetails.getAttribute('data-id');
            const produto = produtos.find(p => p.id === productId);
            if (produto) {
                fillModal(produto);
                productModal.show();
            }
        }

        const btnAddToCart = event.target.closest('.add-to-cart-btn');
        if (btnAddToCart && btnAddToCart.hasAttribute('data-id')) {
            const productId = btnAddToCart.getAttribute('data-id');
            addToCart(productId);
        }
    });

    function addToCart(productId) {
        const produto = produtos.find(p => p.id === productId);
        if (produto) {
            alert(`Adicionado ao carrinho: ${produto.nome}`);
            db.get(productId).then(function(doc) {
                return db.put({
                    _id: productId,
                    _rev: doc._rev,
                    nome: produto.nome,
                    valor: produto.valor,
                    quantidade: doc.quantidade + 1
                });
            }).catch(function(err) {
                if (err.name === 'not_found') {
                    return db.put({
                        _id: productId,
                        nome: produto.nome,
                        valor: produto.valor,
                        quantidade: 1
                    });
                } else {
                    console.log(err);
                }
            }).then(function() {
                
            }).catch(function(err) {
                console.error(err);
            });
        }
    }

    function fillModal(produto) {
        document.querySelector('.modal-img').src = produto.img;
        document.querySelector('.modal-title-product').textContent = produto.nome;
        document.querySelector('.modal-amount').textContent = `Quantidade em estoque: ${produto.qtdEstoque} pcs`;
        document.querySelector('.modal-price').textContent = `Preço: ${produto.valor}`;
        document.querySelector('.modal-description').textContent = produto.descricao;
    }

    function clearModal() {
        document.querySelector('.modal-img').src = "";
        document.querySelector('.modal-title-product').textContent = "";
        document.querySelector('.modal-price').textContent = "";
        document.querySelector('.modal-description').textContent = "";
    }

    cartButton.addEventListener('click', () => {
        cartModal.show();
        showCartItems();
    });

    function showCartItems() {
        db.allDocs({include_docs: true, descending: true}, function(err, doc) {
            if (err) {
                console.error(err);
            } else {
                updateCartUI(doc.rows);
            }
        });
    }

    function updateCartUI(items) {
        const list = document.querySelector('#cartModal .list-group');
        list.innerHTML = '';
        let total = 0;
    
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center bg-dark text-white';
            const price = parseFloat(item.doc.valor.replace('R$', '').replace(',', '.'));
            const subtotal = price * item.doc.quantidade;
            total += subtotal;
    
            li.innerHTML = `
                ${item.doc.nome} - Quantidade: ${item.doc.quantidade} - Subtotal: R$${subtotal.toFixed(2)}
                <div class="btn-group">
                    <button class="btn btn-info btn-sm decrease">-</button>
                    <button class="btn btn-info btn-sm increase">+</button>
                    <button class="btn btn-danger btn-sm remove">x</button>
                </div>
            `;
            list.appendChild(li);
    
            li.querySelector('.decrease').addEventListener('click', () => changeQuantity(item.doc._id, 'decrease'));
            li.querySelector('.increase').addEventListener('click', () => changeQuantity(item.doc._id, 'increase'));
            li.querySelector('.remove').addEventListener('click', () => removeFromCart(item.doc._id));
        });
    
        const totalElement = document.createElement('li');
        totalElement.className = 'list-group-item list-group-item-dark';
        totalElement.textContent = `Total: R$${total.toFixed(2)}`;
        list.appendChild(totalElement);

        document.getElementById('finalize').addEventListener('click', () => finalizePurchase());
    }
    
    function changeQuantity(id, type) {
        db.get(id).then(doc => {
            if (type === 'increase') {
                doc.quantidade += 1;
            } else if (type === 'decrease' && doc.quantidade > 1) {
                doc.quantidade -= 1;
            }
            return db.put(doc);
        }).then(() => {
            showCartItems();
        }).catch(err => console.error(err));
    }
    
    function removeFromCart(id) {
        db.get(id).then(doc => {
            return db.remove(doc);
        }).then(() => {
            showCartItems();
        }).catch(err => console.error(err));
    }

    function finalizePurchase() {
        db.allDocs().then(function (result) {
            return Promise.all(result.rows.map(function (row) {
                return db.remove(row.id, row.value.rev);
            }));
        }).then(function () {
            cartModal.hide();
            alert("Compra finalizada com sucesso");
        }).catch(function (err) {
            console.error(err);
        });
    }
});

