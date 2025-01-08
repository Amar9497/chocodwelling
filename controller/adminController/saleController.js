const Order = require("../../model/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const saleController = {
  
  // -------------------------- sales page render -------------------------------

  salePage: async (req, res) => {
    try {
      const orders = await Order.find({
        orderStatus: { $nin: ["Cancelled", "Returned"] },
      }).populate("userId", "name");

      // Calculate total products sold
      const productResult = await Order.aggregate([
        {
          $match: {
            orderStatus: { $nin: ["Cancelled", "Returned"] },
          },
        },
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: null,
            totalQuantity: {
              $sum: "$products.quantity",
            },
          },
        },
      ]);

      // Get the total quantity
      const productCount =
        productResult.length > 0 ? productResult[0].totalQuantity : 0;

      const summary = {
        totalOrders: orders.length,
        finalAmount: orders.reduce((sum, order) => sum + order.finalAmount, 0),
        productCount,
      };

      res.render("admin/salesreport", {
        orders,
        summary,
        title: "Sales Report",
      });
    } catch (error) {
      console.error("Error in salePage:", error);
      res.redirect("/admin/salesReport");
    }
  },

  // ----------------------- generate report -------------------------

  generateReport: async (req, res) => {
    try {
      const { reportType, startDate, endDate } = req.body;
      let dateFilter = {};

      switch (reportType) {
        case "daily":
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dateFilter = {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          };
          break;

        case "weekly":
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFilter = {
            $gte: weekAgo,
            $lt: new Date(),
          };
          break;

        case "monthly":
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateFilter = {
            $gte: monthAgo,
            $lt: new Date(),
          };
          break;

        case "yearly":
          const yearAgo = new Date();
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          dateFilter = {
            $gte: yearAgo,
            $lt: new Date(),
          };
          break;

        case "custom":
          if (startDate && endDate) {
            dateFilter = {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            };
          }
          break;
      }

      // Get orders for the selected period
      const orders = await Order.find({
        orderStatus: { $nin: ["Cancelled", "Returned"] },
        orderDate: dateFilter,
      })
        .populate("userId", "name")
        .sort({ orderDate: -1 });

      // Calculate product count
      const productResult = await Order.aggregate([
        {
          $match: {
            orderStatus: { $nin: ["Cancelled", "Returned"] },
            orderDate: dateFilter,
          },
        },
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$products.quantity" },
          },
        },
      ]);

      // Calculate summary
      const summary = {
        totalOrders: orders.length,
        finalAmount: orders.reduce(
          (sum, order) => sum + (order.finalAmount || 0),
          0
        ),
        productCount:
          productResult.length > 0 ? productResult[0].totalQuantity : 0,
      };

      const formattedOrders = orders.map((order) => ({
        _id: order._id,
        orderDate: order.orderDate,
        userId: {
          name: order.userId ? order.userId.name : "Unknown",
        },
        totalQuantity: order.products.reduce(
          (sum, product) => sum + product.quantity,
          0
        ),
        paymentMethod: order.paymentMethod,
        couponCode: order.couponCode || "No Coupon",
        finalAmount: order.finalAmount,
        orderStatus: order.orderStatus,
      }));

      res.json({
        success: true,
        orders: formattedOrders,
        summary,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      res.redirect("/admin/salesReport");
    }
  },

  // ------------------------ download report ---------------------------

  downloadReport: async (req, res) => {
    try {
      const orders = await Order.find({
        orderStatus: { $nin: ["Cancelled", "Returned"] },
      }).populate("userId", "name");

      // Calculate product count
      const productResult = await Order.aggregate([
        {
          $match: {
            orderStatus: { $nin: ["Cancelled", "Returned"] },
          },
        },
        {
          $unwind: "$products",
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$products.quantity" },
          },
        },
      ]);

      const summary = {
        totalOrders: orders.length,
        finalAmount: orders.reduce(
          (sum, order) => sum + (order.finalAmount || 0),
          0
        ),
        productCount:
          productResult.length > 0 ? productResult[0].totalQuantity : 0,
      };

      const { format } = req.params;

      if (format === "pdf") {
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument({ layout: "landscape", margin: 40 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=sales-report.pdf"
        );

        doc.pipe(res);

        // Header
        doc.fontSize(20).text("Sales Report", { align: "center" });
        doc.moveDown();

        // Summary section
        doc
          .fontSize(12)
          .text(`Total Orders: ${summary.totalOrders}`)
          .text(`Total Products Sold: ${summary.productCount}`)
          .text(`Total Revenue: ${summary.finalAmount}`);
        doc.moveDown();

        // Table headers with adjusted column positions
        const tableTop = 150;
        doc
          .fontSize(10)
          .text("Order ID", 40, tableTop)
          .text("Date", 110, tableTop)
          .text("Customer", 180, tableTop)
          .text("Quantity", 300, tableTop)
          .text("Payment", 370, tableTop)
          .text("Coupon", 450, tableTop)
          .text("Amount", 550, tableTop)
          .text("Status", 650, tableTop);

        // Table data
        let y = tableTop + 20;
        orders.forEach((order) => {
          if (y > 500) {
            doc.addPage({ layout: "landscape" });
            y = 50;

            doc
              .fontSize(10)
              .text("Order ID", 40, y)
              .text("Date", 110, y)
              .text("Customer", 180, y)
              .text("Quantity", 300, y)
              .text("Payment", 370, y)
              .text("Coupon", 450, y)
              .text("Amount", 550, y)
              .text("Status", 650, y);

            y += 20; //
          }

          const totalQuantity = order.products.reduce(
            (sum, product) => sum + product.quantity,
            0
          );

          doc.fontSize(10).text(order._id.toString().slice(-6), 40, y);
          doc.text(new Date(order.orderDate).toLocaleDateString(), 110, y);

          const customerFontSize = order.userId.name.length > 15 ? 8 : 10;
          doc
            .fontSize(customerFontSize)
            .text(order.userId.name, 180, y, { width: 100, ellipsis: true });

          doc
            .fontSize(10)
            .text(totalQuantity.toString(), 300, y)
            .text(order.paymentMethod, 370, y)
            .text(order.couponCode || "No Coupon", 450, y, {
              width: 80,
              ellipsis: true,
            })
            .text(order.finalAmount, 550, y)
            .text(order.orderStatus, 650, y);

          y += 20;
        });

        doc.end();
      } else if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        // Add headers
        worksheet.columns = [
          { header: "Order ID", key: "orderId", width: 15 },
          { header: "Date", key: "date", width: 15 },
          { header: "Customer", key: "customer", width: 20 },
          { header: "Quantity", key: "quantity", width: 10 },
          { header: "Payment Method", key: "payment", width: 15 },
          { header: "Coupon", key: "coupon", width: 15 },
          { header: "Amount", key: "amount", width: 15 },
          { header: "Status", key: "status", width: 15 },
        ];

        worksheet.getRow(1).font = { bold: true };

        // Add data
        orders.forEach((order) => {
          const totalQuantity = order.products.reduce(
            (sum, product) => sum + product.quantity,
            0
          );

          worksheet.addRow({
            orderId: order._id.toString(),
            date: new Date(order.orderDate).toLocaleDateString(),
            customer: order.userId.name,
            quantity: totalQuantity,
            payment: order.paymentMethod,
            coupon: order.couponCode || "No Coupon",
            amount: order.finalAmount,
            status: order.orderStatus,
          });
        });

        // Add summary section
        worksheet.addRow({});
        worksheet.addRow({
          customer: "Summary",
          amount: "",
        }).font = { bold: true };

        worksheet.addRow({
          customer: "Total Orders:",
          amount: summary.totalOrders,
        });
        worksheet.addRow({
          customer: "Total Products Sold:",
          amount: summary.productCount,
        });
        worksheet.addRow({
          customer: "Total Revenue:",
          amount: `₹${summary.finalAmount}`,
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=sales-report.xlsx"
        );

        await workbook.xlsx.write(res);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      res.redirect("/admin/salesReport");
    }
  },
};

module.exports = saleController;
