import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function updateCart(newCart: Product[]) {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    setCart(newCart);
  }

  async function validateStock(
    productId: number,
    amountSale: number
  ): Promise<boolean> {
    let retorno = true;
    await api
      .get("/stock/" + productId)
      .then(({ data }) => {
        if (amountSale > data.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          retorno = false;
        }
      })
      .catch((err) => {
        toast.error("Quantidade solicitada fora de estoque");
        retorno = false;
      });

    return retorno;
  }

  const addProduct = async (productId: number) => {
    try {
      const stock = await api
        .get("/stock/" + productId)
        .then(({ data }) => {
          return data.amount;
        })
        .catch((err) => {
          toast.error("Quantidade solicitada fora de estoque");
        });

      if (cart.find((p) => p.id === productId) === undefined) {
        const product = await api
          .get("/products/" + productId)
          .then(({ data }) => {
            return data;
          })
          .catch((err) => {
            throw err;
          });

        if (stock === undefined || stock < 1) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        } else {
          updateCart([...cart, { ...product, amount: 1 }]);
        }
      } else {
        let newAmount = (cart.find((p) => p.id === productId) as Product)?.amount  + 1;
        

        console.log("prod" + productId , stock, newAmount);
        if (stock === undefined || stock < newAmount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        } else {
          const newCart = cart.map((p) => {
            if (p.id === productId) {
              p.amount += 1;
            }
  
            return p;
          });
          updateCart(newCart);
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.find((p) => p.id === productId) === undefined) {
        throw new Error();
      }

      updateCart(cart.filter((p) => p.id !== productId));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount == 0) {
        return cart;
      }

      if (cart.find((p) => p.id === productId) === undefined) {
        throw new Error();
      }

      validateStock(productId, amount).then((retorno) => {
        if (retorno === true) {
          const newCart = cart.map((p) => {
            if (p.id === productId) {
              p.amount = amount;
            }
            return p;
          });

          updateCart(newCart);
        }
      });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
