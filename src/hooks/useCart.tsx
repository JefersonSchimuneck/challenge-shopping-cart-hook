import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    console.log(prevCartRef)
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const currentCart = [...cart]
      const isProductInCart = currentCart.find(product => product.id === productId);
      const { data: { amount: productStockQuantity } } = await api.get(`stock/${productId}`);
      const productCartQuantity = isProductInCart ? isProductInCart.amount : 0;
      const updatedProductQuantity = productCartQuantity + 1;

      if (updatedProductQuantity > productStockQuantity ) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (isProductInCart) {
        isProductInCart.amount = updatedProductQuantity;
      }

      if (!isProductInCart) {
        const { data } = await api.get(`products/${productId}`);
        const newProduct = { ...data, amount: 1};
        currentCart.push(newProduct)
      }
      
      setCart(currentCart)
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInCart = cart.find(product => product.id === productId);

      if (!isProductInCart) throw Error();

      if (isProductInCart) {
        const cartWithoutRemovedItem = cart.filter(product => product.id !== productId)
        setCart(cartWithoutRemovedItem)
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithoutRemovedItem))
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: { amount: productStockQuantity } } = await api.get(`stock/${productId}`);

      if (!amount) return;

      if (amount > productStockQuantity) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const currentCart = [...cart]
      const isProductInCart = currentCart.find(product => product.id === productId);

      if (!isProductInCart) throw Error();

      if (isProductInCart) {
        isProductInCart.amount = amount;
        setCart(currentCart);
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(currentCart));
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
