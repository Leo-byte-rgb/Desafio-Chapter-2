import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedItems = localStorage.getItem("@RocketShoes:cart");

    if (storagedItems) {
      return JSON.parse(storagedItems ?? "");
    }
    return [];
  });

  const productNotExists = (product?: Product) => {
    return !Boolean(product);
  };

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const product = updatedCart.find((item) => item.id === productId);
      if (productNotExists(product)) {
        const { data } = await api.get<Product>(`/products/${productId}`);
        updatedCart.push({ ...data, amount: 1 });
      } else {
        const { data } = await api.get<Stock>(`/stock/${productId}`);

        const amount = product!.amount + 1;
        const stock = data.amount;

        if (amount > stock) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        product!.amount = amount;
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch (e) {
      console.log(e);
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(({ id }) => id === productId);
      if (!product) throw new Error();
      const updatedCart = cart.filter(({ id }) => id !== productId);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (item) => item.id === productId
      );
      console.log(productIndex);
      if (productIndex < 0) throw new Error();

      const { data } = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = data.amount;
      console.log(data, amount);
      if (amount > stockAmount) {
        return toast.error("Quantidade solicitada fora de estoque");
      }

      updatedCart[productIndex].amount = amount;
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch (e) {
      console.log(e);
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
