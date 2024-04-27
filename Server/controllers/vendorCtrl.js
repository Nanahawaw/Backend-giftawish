import asyncHandler from 'express-async-handler';
import slugify from 'slugify';
import Product from '../models/productModel.js';
import Vendor from '../models/vendorModel.js';
import { productImageUpload } from '../config/multerConfig.js';
import { deleteResourcesFromCloudinary } from '../utils/cloudinaryUtils.js';

export const addProduct = asyncHandler(async (req, res) => {
  const vendor = req.vendor._id;
  const { name, description, price, category, quantity, tags } = req.body;
  try {
    // Check if a product with the same slug already exists
    const existingProduct = await Product.findOne({
      slug: slugify(name, { lower: true, strict: true }),
    });
    if (existingProduct) {
      return res
        .status(400)
        .json({ error: 'A product with the same name already exists' });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      quantity,
      tags,
      vendor,
    });
    product.slug = slugify(product.name, { lower: true, strict: true });
    const createdProduct = await product.save();

    await Vendor.findByIdAndUpdate(vendor, {
      $push: { products: createdProduct._id },
    });
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export const uploadProductImage = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const findProduct = await Product.findById(id);

    if (!findProduct) return res.status(404).json('Product not found');

    // Initialize images with an empty array
    let images = [];

    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.filename);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $push: { images: { $each: images } } },
      { new: true }
    );

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});
export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const productToUpdate = await Product.findById(req.params.id);
    if (!productToUpdate) return res.status(404).json('Product not found');

    productToUpdate.name = req.body.name || productToUpdate.name;
    productToUpdate.description =
      req.body.description || productToUpdate.description;
    productToUpdate.price = req.body.price || productToUpdate.price;
    productToUpdate.category = req.body.category || productToUpdate.category;
    productToUpdate.tags = req.body.tags || productToUpdate.tags;
    productToUpdate.quantity = req.body.quantity || productToUpdate.quantity;

    //handle image deletion
    if (req.body.imagesToDelete) {
      let imagesToDeleteArray;

      // Convert imagesToDelete to an array if it's not already one
      if (Array.isArray(req.body.imagesToDelete)) {
        imagesToDeleteArray = req.body.imagesToDelete;
      } else {
        imagesToDeleteArray = [req.body.imagesToDelete];
      }
      const publicIds = imagesToDeleteArray
        .map((index) => {
          if (index >= 0 && index < productToUpdate.images.length) {
            return productToUpdate.images[index].split('/').pop().split('.')[0];
          }
        })
        .filter((publicId) => publicId); // Filter out any undefined values

      // Remove the deleted images from the product
      productToUpdate.images = productToUpdate.images.filter(
        (_, index) => !imagesToDeleteArray.includes(index)
      );

      // Delete resources from Cloudinary
      await deleteResourcesFromCloudinary('product-images', publicIds);
    }
    //handle image upload
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.filename);
      const imageToReplaceIndex = req.body.imageToReplace;

      if (imageToReplaceIndex !== undefined) {
        // Replace the image at the specified index
        if (
          imageToReplaceIndex >= 0 &&
          imageToReplaceIndex < productToUpdate.images.length
        ) {
          productToUpdate.images[imageToReplaceIndex] = newImages[0];
        } else {
          return res
            .status(400)
            .json({ message: 'Invalid imageToReplace index' });
        }
      } else {
        // Append new images or replace existing images
        if (productToUpdate.images.length + newImages.length <= 6) {
          productToUpdate.images = [...productToUpdate.images, ...newImages];
        } else {
          return res
            .status(400)
            .json({ message: 'Maximum 6 images can be uploaded' });
        }
      }
    }

    const updatedProduct = await productToUpdate.save();
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
export const allProductsByVendor = asyncHandler(async (req, res) => {
  try {
    const companyName = req.query.companyName || req.body.companyName;
    if (!companyName) {
      return res.status(400).json({ message: 'Company name is required' });
    }
    const vendor = await Vendor.findOne({ companyName });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    const products = await Product.find({ vendor });
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const productId = req.params.id;
    const deleteProduct = await Product.findByIdAndDelete(productId);
    if (!deleteProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Remove the product ID from the vendor's products array
    const vendor = await Vendor.findById(deleteProduct.vendor);
    await Vendor.updateOne(
      { _id: vendor._id },
      { $pull: { products: productId } }
    );
    //delete images from cloudinary
    const publicIds = deleteProduct.images.map(
      (image) => image.split('/').pop().split('.')[0]
    );
    await deleteResourcesFromCloudinary('product-images', publicIds);
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
