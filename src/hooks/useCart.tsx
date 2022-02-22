import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
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
    const storagedItems = localStorage.getItem("@RocketShoes:card");

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
      localStorage.setItem("@RocketShoes:card", JSON.stringify(updatedCart));
    } catch (e) {
      console.log(e);
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(({ id }) => id === productId);
      if (!product) throw new Error();
      setCart(cart.filter(({ id }) => id !== productId));
      localStorage.setItem("@RocketShoes:card", JSON.stringify(cart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;
      const updatedCart = [...cart];
      const product = updatedCart.find((item) => item.id === productId);
      if (!product) {
        return toast.error("Erro na alteração de quantidade do produto");
      }

      const { data } = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = data.amount;

      if (amount > stockAmount) {
        return toast.error("Quantidade solicitada fora de estoque");
      }

      product.amount = amount;
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:card", JSON.stringify(updatedCart));
    } catch {
      // TODO
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
