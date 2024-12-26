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

    // Calculate total for the cart
    const cartDetails = cartItems.map((item) => {
      // Get price from the first variant 
      const price = item.productId.productVariants[0].price;
      return {
        product: item.productId,
        quantity: item.quantity,
        subtotal: price * item.quantity,
      };
    });
    

    const total = cartDetails.reduce((acc, item) => acc + item.subtotal, 0);

    res.render("user/cart", {
      title: "Cart",
      cartItems: cartDetails,
      total,
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

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({
        status: false,
        message: "Quantity must be at least 1",
      });
    }

    // Find the cart item
    const cartItem = await cartSchema
      .findOne({ userId, productId })
      .populate("productId");

    if (!cartItem) {
      return res.status(404).json({
        status: false,
        message: "Cart item not found",
      });
    }

    // Check stock availability
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

    // Update quantity
    cartItem.quantity = quantity;
    await cartItem.save();

    // Calculate new subtotal 
    const subtotal = product.productVariants[0].price * quantity;

    // Get cart total
    const allCartItems = await cartSchema
      .find({ userId })
      .populate("productId");
    const total = allCartItems.reduce((sum, item) => {
      return sum + item.productId.productVariants[0].price * item.quantity;
    }, 0);

    return res.status(200).json({
      status: true,
      message: "Cart updated successfully",
      subtotal: subtotal,
      total: total,
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
