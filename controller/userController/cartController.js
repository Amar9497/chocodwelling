const productSchema = require("../../model/productSchema");
const cartSchema = require("../../model/cartSchema");
const userSchema = require("../../model/userSchema");

const { ObjectId } = require("mongodb");
const { product } = require("../adminController/productController");
const { model } = require("mongoose");

// ----------------------- cart page redring --------------------------


const cart = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await userSchema.findById(userId);
    if (!userId) {
      return res.redirect("/login");
    }

    const cartItems = await cartSchema
      .find({ userId })
      .populate("productId")
      .exec();

    // Calculate total for the cart with discounts
    const cartDetails = cartItems.map((item) => {
      const basePrice = item.productId.productVariants[0].price;
      const discount = item.productId.productDiscount || 0;
      const discountedPrice = basePrice - (basePrice * discount / 100);
      
      return {
        product: item.productId,
        quantity: item.quantity,
        basePrice: basePrice,
        discount: discount,
        discountedPrice: discountedPrice,
        subtotal: discountedPrice * item.quantity,
        savings: (basePrice - discountedPrice) * item.quantity
      };
    });

    const totals = cartDetails.reduce((acc, item) => {
      return {
        total: acc.total + item.subtotal,
        savings: acc.savings + item.savings
      };
    }, { total: 0, savings: 0 });

    res.render("user/cart", {
      title: "Cart",
      cartItems: cartDetails,
      total: totals.total,
      totalSavings: totals.savings,
      user,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).send("Error loading cart");
  }
};

// ---------------------------------- product add to cart -----------------------

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, quantity } = req.body;

    // Find the product
    const product = await productSchema.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: false,
        message: "Product not found",
      });
    }

    // Check stock greater than 0
    const hasStock = product.productVariants.some(
      (variant) => variant.stock > 0
    );

    if (!hasStock) {
      return res.status(400).json({
        status: false,
        message: "Product is out of stock",
      });
    }

    // Check product is already existing
    let cartItem = await cartSchema.findOne({ userId, productId });

    if (cartItem) {
      const totalQuantity = cartItem.quantity + quantity;
      if (totalQuantity > 4) {
        return res.status(400).json({
            status: false,
            message: "You cannot add more than 4 units Limit Exceeded",
        });
    }
      cartItem.quantity = totalQuantity;
      await cartItem.save();

      return res.status(200).json({
        status: true,
        message: "Cart updated successfully!",
        cartItem: cartItem,
      });
    } else {
      // Create a new cart item 
      cartItem = new cartSchema({
        userId,
        productId,
        quantity,
        //price: product.productVariants[0].price,
      });
      await cartItem.save();

      return res.status(200).json({
        status: true,
        message: "Product added to cart successfully!",
        cartItem: cartItem,
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to add product to the cart",
    });
  }
};



// ----------------------------- update cart -----------------------------

const updateCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        status: false,
        message: "Quantity must be at least 1",
      });
    }

    const cartItem = await cartSchema
      .findOne({ userId, productId })
      .populate("productId");

    if (!cartItem) {
      return res.status(404).json({
        status: false,
        message: "Cart item not found",
      });
    }

    const product = cartItem.productId;
    const hasStock = product.productVariants.some(
      (variant) => variant.stock >= quantity
    );

    if (!hasStock) {
      return res.status(400).json({
        status: false,
        message: "Requested quantity not available in stock",
      });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    // Calculate new subtotal with discount
    const basePrice = product.productVariants[0].price;
    const discount = product.productDiscount || 0;
    const discountedPrice = basePrice - (basePrice * discount / 100);
    const subtotal = discountedPrice * quantity;
    const itemSavings = (basePrice - discountedPrice) * quantity;

    // Get cart total with discounts
    const allCartItems = await cartSchema
      .find({ userId })
      .populate("productId");
      
    const totals = allCartItems.reduce((acc, item) => {
      const itemBasePrice = item.productId.productVariants[0].price;
      const itemDiscount = item.productId.productDiscount || 0;
      const itemDiscountedPrice = itemBasePrice - (itemBasePrice * itemDiscount / 100);
      
      return {
        total: acc.total + (itemDiscountedPrice * item.quantity),
        savings: acc.savings + ((itemBasePrice - itemDiscountedPrice) * item.quantity)
      };
    }, { total: 0, savings: 0 });

    return res.status(200).json({
      status: true,
      message: "Cart updated successfully",
      subtotal: subtotal,
      itemSavings: itemSavings,
      total: totals.total,
      totalSavings: totals.savings,
      discountedPrice: discountedPrice,
      basePrice: basePrice,
      discount: discount
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update cart",
    });
  }
};

// ------------------------------ remove product from cart ----------------------------

const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;

        // Remove the item from cart
        await cartSchema.findOneAndDelete({ userId, productId });

        // Get updated cart total
        const remainingItems = await cartSchema.find({ userId }).populate('productId');
        
        const total = remainingItems.reduce((sum, item) => {
            return sum + (item.productId.productVariants[0].price * item.quantity);
        }, 0);

        return res.status(200).json({
            status: true,
            message: "Item removed from cart",
            total: total,
            isEmpty: remainingItems.length === 0
        });

    } catch (error) {
        console.error("Error removing from cart:", error);
        return res.status(500).json({
            status: false,
            message: "Failed to remove item from cart"
        });
    }
};

module.exports = {
  cart,
  addToCart,
  updateCart,
  removeFromCart
};
