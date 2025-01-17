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
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateFilter = {
                    orderDate: {
                        $gte: today,
                        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                    }
                };
                break;

            case "weekly":
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - 7);
                weekStart.setHours(0, 0, 0, 0);
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
                    const startDateTime = new Date(startDate);
                    startDateTime.setHours(0, 0, 0, 0);
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    dateFilter = {
                        orderDate: {
                            $gte: startDateTime,
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

        // Fetch filtered orders with populated user data
        const orders = await Order.find(filter)
            .populate("userId", "name")
            .sort({ orderDate: -1 });

        // Calculate summary statistics
        const productCount = orders.reduce((sum, order) => 
            sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0);

        const summary = {
            totalOrders: orders.length,
            productCount,
            finalAmount: orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0)
        };

        res.json({
            success: true,
            orders: orders.map(order => ({
                _id: order._id,
                orderDate: order.orderDate,
                userId: { name: order.userId?.name || 'Unknown' },
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
    console.log(req.body);
    
    try {
        const { reportType, startDate, endDate, format } = req.body;
        let dateFilter = {};

        // Create date filter based on report type
        const now = new Date();
        switch (reportType) {
            case "daily":
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dateFilter = {
                    orderDate: {
                        $gte: today,
                        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                    }
                };
                break;
            case "weekly":
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - 7);
                dateFilter = {
                    orderDate: { $gte: weekStart }
                };
                break;
            case "monthly":
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                dateFilter = {
                    orderDate: { $gte: monthStart }
                };
                break;
            case "yearly":
                const yearStart = new Date(now.getFullYear(), 0, 1);
                dateFilter = {
                    orderDate: { $gte: yearStart }
                };
                break;
            case "custom":
                if (startDate && endDate) {
                    const startDateTime = new Date(startDate);
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    dateFilter = {
                        orderDate: {
                            $gte: startDateTime,
                            $lte: endDateTime
                        }
                    };
                }
                break;
        }

        // Add status filter
        const filter = {
            ...dateFilter,
            orderStatus: { $nin: ['Cancelled', 'Returned'] }
        };

        // Fetch orders
        const orders = await Order.find(filter)
            .populate('userId', 'name')
            .sort({ orderDate: -1 });

        // Calculate summary
        const summary = {
            totalOrders: orders.length,
            productCount: orders.reduce((sum, order) => 
                sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0),
            finalAmount: orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0)
        };

        if (format === 'pdf') {
            // Create PDF document
            const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

            // Set response headers for PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

            // Pipe the PDF to the response
            doc.pipe(res);

            // Add title
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .text('Sales Report', { align: 'center' })
               .moveDown();

            // Add summary section
            doc.fontSize(12)
               .font('Helvetica')
               .text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`)
               .text(`Total Orders: ${summary.totalOrders}`)
               .text(`Total Products Sold: ${summary.productCount}`)
               .text(`Total Revenue: ₹${summary.finalAmount.toFixed(2)}`)
               .moveDown();

            // Define table layout
            const tableTop = 200;
            const columnSpacing = 80;
            let currentY = tableTop;

            // Add table headers
            const headers = ['Order ID', 'Date', 'Customer', 'Products', 'Payment', 'Amount', 'Status'];
            doc.font('Helvetica-Bold').fontSize(10);
            headers.forEach((header, i) => {
                doc.text(header, 30 + (i * columnSpacing), currentY);
            });

            // Add table rows
            currentY += 20;
            doc.font('Helvetica').fontSize(9);

            orders.forEach((order) => {
                // Add new page if needed
                if (currentY > 500) {
                    doc.addPage();
                    currentY = 50;
                    // Repeat headers on new page
                    doc.font('Helvetica-Bold').fontSize(10);
                    headers.forEach((header, i) => {
                        doc.text(header, 30 + (i * columnSpacing), currentY);
                    });
                    doc.font('Helvetica').fontSize(9);
                    currentY += 20;
                }

                // Add row data
                const row = [
                    order._id.toString().slice(-6),
                    new Date(order.orderDate).toLocaleDateString(),
                    order.userId?.name || 'N/A',
                    order.products.reduce((sum, p) => sum + p.quantity, 0),
                    order.paymentMethod,
                    `₹${order.finalAmount.toFixed(2)}`,
                    order.orderStatus
                ];

                row.forEach((text, i) => {
                    doc.text(text.toString(), 30 + (i * columnSpacing), currentY, {
                        width: columnSpacing - 10,
                        align: i === 5 ? 'right' : 'left' // Align amount to right
                    });
                });

                currentY += 20;
            });

            // Finalize PDF
            doc.end();

        } else if (format === 'excel') {
            
            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Add title
            worksheet.mergeCells('A1:H1');
            worksheet.getCell('A1').value = 'Sales Report';
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.getCell('A1').font = { bold: true, size: 16 };

            // Add summary section
            worksheet.getCell('A3').value = 'Report Type:';
            worksheet.getCell('B3').value = reportType.charAt(0).toUpperCase() + reportType.slice(1);

            worksheet.getCell('A4').value = 'Total Orders:';
            worksheet.getCell('B4').value = summary.totalOrders;

            worksheet.getCell('A5').value = 'Total Products Sold:';
            worksheet.getCell('B5').value = summary.productCount;

            worksheet.getCell('A6').value = 'Total Revenue:';
            worksheet.getCell('B6').value = `₹${summary.finalAmount.toFixed(2)}`;

            // Add headers at row 8
            const headers = [
                'Order ID',
                'Date',
                'Customer',
                'Products',
                'Payment Method',
                'Coupon',
                'Amount',
                'Status'
            ];
            worksheet.addRow(headers);
            worksheet.getRow(8).font = { bold: true };

            // Add order data
            orders.forEach(order => {
                worksheet.addRow([
                    order._id.toString(),
                    new Date(order.orderDate).toLocaleDateString(),
                    order.userId?.name || 'N/A',
                    order.products.reduce((sum, p) => sum + p.quantity, 0),
                    order.paymentMethod,
                    order.couponCode || 'No Coupon',
                    `₹${order.finalAmount.toFixed(2)}`,
                    order.orderStatus
                ]);
            });

            // Style columns
            worksheet.columns.forEach(column => {
                column.width = 15;
                column.alignment = { horizontal: 'left' };
            });

            // Update these response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
            
            // End the response after writing
            await workbook.xlsx.write(res);
            res.end();
        }

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            message: `Failed to generate ${format} report`
        });
    }
  },
};

module.exports = saleController;
