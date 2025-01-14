const Order = require("../../model/orderSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const saleController = {
  
  // -------------------------- sales page render -------------------------------

  salePage: async (req, res) => {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalOrders = await Order.countDocuments({
        orderStatus: { $nin: ["Cancelled", "Returned"] },
      });

      // Get paginated orders
      const orders = await Order.find({
        orderStatus: { $nin: ["Cancelled", "Returned"] },
      })
        .populate("userId", "name")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit);

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

      const productCount = productResult.length > 0 ? productResult[0].totalQuantity : 0;

      const summary = {
        totalOrders: totalOrders,
        finalAmount: orders.reduce((sum, order) => sum + order.finalAmount, 0),
        productCount,
      };

      res.render("admin/salesreport", {
        orders,
        summary,
        title: "Sales Report",
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
        },
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

        // Create date filter based on report type
        const now = new Date();
        switch (reportType) {
            case "daily":
                dateFilter = {
                    orderDate: {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lt: new Date(now.setHours(23, 59, 59, 999))
                    }
                };
                break;

            case "weekly":
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - 7);
                dateFilter = {
                    orderDate: {
                        $gte: weekStart,
                        $lt: now
                    }
                };
                break;

            case "monthly":
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                dateFilter = {
                    orderDate: {
                        $gte: monthStart,
                        $lt: now
                    }
                };
                break;

            case "yearly":
                const yearStart = new Date(now.getFullYear(), 0, 1);
                dateFilter = {
                    orderDate: {
                        $gte: yearStart,
                        $lt: now
                    }
                };
                break;

            case "custom":
                if (startDate && endDate) {
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    dateFilter = {
                        orderDate: {
                            $gte: new Date(startDate),
                            $lte: endDateTime
                        }
                    };
                }
                break;
        }

        // Add status filter to exclude cancelled and returned orders
        const filter = {
            ...dateFilter,
            orderStatus: { $nin: ["Cancelled", "Returned"] }
        };

        // Fetch filtered orders
        const orders = await Order.find(filter)
            .populate("userId", "name")
            .sort({ orderDate: -1 });

        // Calculate summary statistics
        const productCount = orders.reduce((sum, order) => 
            sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0);

        const summary = {
            totalOrders: orders.length,
            productCount,
            finalAmount: orders.reduce((sum, order) => sum + order.finalAmount, 0)
        };

        // Send response
        res.json({
            success: true,
            orders: orders.map(order => ({
                _id: order._id,
                orderDate: order.orderDate,
                userId: {
                    name: order.userId.name
                },
                totalQuantity: order.products.reduce((sum, product) => sum + product.quantity, 0),
                paymentMethod: order.paymentMethod,
                couponCode: order.couponCode,
                finalAmount: order.finalAmount,
                orderStatus: order.orderStatus
            })),
            summary
        });

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate report"
        });
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
